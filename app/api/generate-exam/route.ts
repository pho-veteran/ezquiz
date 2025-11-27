import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { SchemaType, type Schema } from "@google/generative-ai";
import { uploadFileToGemini, extractTextFromFile } from "@/lib/google-ai";
import { AIResponseSchema, type GeneratedQuestion } from "@/lib/zod-schema";
import { ensureDbUser } from "@/lib/ensure-db-user";

const CHUNK_SIZE = 10;
const MAX_QUESTIONS = 150;
const PREVIOUS_SUMMARY_LIMIT = 5;

type DocumentSource =
    | { type: "text"; content: string }
    | { type: "file"; uri: string; mimeType: string };

/**
 * POST /api/generate-exam
 * Generate exam questions from uploaded document using AI
 *
 * Request Body (FormData):
 * - file: The document file (PDF, TXT, DOCX, or Image)
 * - title: The exam title
 * - numQuestions: Number of questions to generate (default: 10)
 * - customInstruction: Optional custom instructions for AI (only for file mode)
 *
 * Response:
 * - success: boolean
 * - examId: string (if success)
 * - examCode: string (if success)
 * - error: string (if failed)
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Authentication - Get user from Clerk
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized. Please sign in to create exams.",
                },
                { status: 401 }
            );
        }

        const user = await ensureDbUser(userId);

        // 2. Parse form data
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const title = formData.get("title") as string;
        const rawNumQuestions =
            parseInt(formData.get("numQuestions") as string) || 10;
        const numQuestions = Math.min(
            Math.max(rawNumQuestions, 1),
            MAX_QUESTIONS
        );
        const customInstruction = (formData.get("customInstruction") as string) || undefined;

        // Validate required fields
        if (!file) {
            return NextResponse.json(
                {
                    success: false,
                    error: "No file provided. Please upload a document.",
                },
                { status: 400 }
            );
        }

        if (!title || title.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: "Exam title is required." },
                { status: 400 }
            );
        }

        if (rawNumQuestions < 1 || rawNumQuestions > MAX_QUESTIONS) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Number of questions must be between 1 and ${MAX_QUESTIONS}.`,
                },
                { status: 400 }
            );
        }

        // 3. Upload file to Gemini or extract text
        let documentSource: DocumentSource;

        if (file.type === "text/plain") {
            const textContent = await extractTextFromFile(file);
            documentSource = { type: "text", content: textContent };
        } else {
            const uploadResult = await uploadFileToGemini(file);
            documentSource = {
                type: "file",
                uri: uploadResult.uri,
                mimeType: uploadResult.mimeType,
            };
        }

        // 4. Generate questions using AI (structured output + chunking)
        const { genAI } = await import("@/lib/google-ai");
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
        });

        const questionResponseSchema: Schema = {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    content: { type: SchemaType.STRING },
                    options: {
                        type: SchemaType.ARRAY,
                        items: { type: SchemaType.STRING },
                        minItems: 4,
                        maxItems: 4,
                    },
                    correctIdx: { type: SchemaType.INTEGER },
                    explanation: { type: SchemaType.STRING },
                    difficulty: {
                        type: SchemaType.STRING,
                    },
                },
                required: ["content", "options", "correctIdx", "explanation"],
            },
        };

        const aggregatedQuestions: GeneratedQuestion[] = [];
        const totalChunks = Math.ceil(numQuestions / CHUNK_SIZE);

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const remaining = numQuestions - aggregatedQuestions.length;
            const questionsThisChunk = Math.min(CHUNK_SIZE, remaining);
            const previousSummary = buildPreviousSummary(aggregatedQuestions);
            const languageSample = buildLanguageSample(aggregatedQuestions);
            
            const chunkPrompt = buildChunkPrompt(questionsThisChunk, previousSummary, customInstruction, languageSample);
            const contents = buildContents(documentSource, chunkPrompt);

            let response;
            try {
                response = await model.generateContent({
                    contents,
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseSchema: questionResponseSchema,
                    },
                });
            } catch (error) {
                throw new Error(
                    `Failed to generate questions for chunk ${chunkIndex + 1}: ${
                        error instanceof Error ? error.message : "Unknown error"
                    }`
                );
            }

            const responseText = response.response.text();

            if (!responseText) {
                throw new Error(
                    `Gemini returned an empty response for chunk ${chunkIndex + 1}.`
                );
            }

            let parsedChunk;
            try {
                const rawData = JSON.parse(responseText);
                
                // Fix any out-of-range correctIdx values before validation
                if (Array.isArray(rawData)) {
                    rawData.forEach((question: { correctIdx?: number }) => {
                        if (typeof question.correctIdx === "number") {
                            // Clamp to valid range [0, 3]
                            if (question.correctIdx < 0) {
                                question.correctIdx = 0;
                            } else if (question.correctIdx > 3) {
                                question.correctIdx = 3;
                            }
                        }
                    });
                }
                
                parsedChunk = AIResponseSchema.parse(rawData);
            } catch (error) {
                console.error(
                    `Failed to validate Gemini output for chunk ${chunkIndex + 1}:`,
                    error
                );
                throw new Error(
                    `Gemini returned malformed data for chunk ${
                        chunkIndex + 1
                    }. Please try again.`
                );
            }

            aggregatedQuestions.push(
                ...parsedChunk.slice(0, questionsThisChunk)
            );
        }

        if (aggregatedQuestions.length < numQuestions) {
            throw new Error(
                "AI returned fewer questions than requested. Please try again."
            );
        }

        const questions = aggregatedQuestions.slice(0, numQuestions);

        // 5. Save to database
        // Generate unique exam code
        let examCode = generateExamCode();
        let codeExists = await prisma.exam.findUnique({
            where: { code: examCode },
        });

        // Ensure code is unique
        while (codeExists) {
            examCode = generateExamCode();
            codeExists = await prisma.exam.findUnique({
                where: { code: examCode },
            });
        }

        // Create exam with questions in a transaction
        const exam = await prisma.exam.create({
            data: {
                code: examCode,
                title: title.trim(),
                status: "DRAFT",
                authorId: user.id,
                questions: {
                    create: questions.map((q) => ({
                        content: q.content,
                        options: q.options, // JSON type in Prisma
                        correctIdx: q.correctIdx,
                        explanation: q.explanation || "",
                    })),
                },
            },
            include: {
                questions: true,
            },
        });

        console.log(
            `Successfully created exam ${exam.code} with ${exam.questions.length} questions`
        );

        // 6. Return success response
        return NextResponse.json({
            success: true,
            examId: exam.id,
            examCode: exam.code,
            questionsCount: exam.questions.length,
        });
    } catch (error) {
        console.error("Error generating exam:", error);

        // Return appropriate error message
        const errorMessage =
            error instanceof Error
                ? error.message
                : "An unexpected error occurred while generating the exam. Please try again.";

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            },
            { status: 500 }
        );
    }
}

/**
 * Generate a unique 8-character exam code
 * Format: XXXX-XXXX (e.g., EXAM-1234)
 */
function generateExamCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const firstPart = Array.from(
        { length: 4 },
        () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    const secondPart = Array.from(
        { length: 4 },
        () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    return `${firstPart}-${secondPart}`;
}

function buildPreviousSummary(questions: GeneratedQuestion[]): string {
    if (questions.length === 0) {
        return "No questions generated yet.";
    }

    return questions
        .slice(-PREVIOUS_SUMMARY_LIMIT)
        .map((question, index) => {
            const cleanContent = question.content.replace(/\s+/g, " ").trim();
            const truncated =
                cleanContent.length > 160
                    ? `${cleanContent.slice(0, 157)}...`
                    : cleanContent;
            return `${index + 1}. ${truncated}`;
        })
        .join("\n");
}

function buildLanguageSample(questions: GeneratedQuestion[]): string | undefined {
    if (questions.length === 0) return undefined;
    
    // Extract a sample of text from the first question to help the model identify the language
    // This provides context without hardcoding specific languages
    const firstQuestion = questions[0];
    const sample = `${firstQuestion.content.substring(0, 100)}${firstQuestion.options[0]?.substring(0, 50) || ""}`;
    
    return sample.trim();
}

function buildChunkPrompt(
    questionsNeeded: number,
    previousSummary: string,
    customInstruction?: string,
    languageSample?: string
): string {
    const prompt = `# Role
You are an expert educational assessment creator specializing in generating high-quality multiple-choice questions (MCQs) from source documents.

# Goal / Task
Generate exactly ${questionsNeeded} new, non-overlapping multiple-choice questions based exclusively on the provided document. Each question must be answerable using only information from the document.

# Context / Background
${previousSummary && previousSummary.trim() !== "No questions generated yet." ? `Previously generated questions (avoid repeating these topics):\n${previousSummary}\n` : "This is the first batch of questions.\n"}

# Constraints & Requirements

## Schema Compliance (MANDATORY - Highest Priority)
- Return ONLY a JSON array matching the exact schema structure
- Each question object MUST contain:
  - \`content\`: string (the question text)
  - \`options\`: array of exactly 4 strings (answer choices)
  - \`correctIdx\`: integer in range [0, 3] (0 = first option, 1 = second option, 2 = third option, 3 = fourth option)
  - \`explanation\`: string (explanation of the correct answer)
  - \`difficulty\`: optional string, one of: "Easy", "Medium", "Hard" (only include if clearly determinable from document complexity)
- Do NOT include any text, markdown, or prose outside the JSON array
- Do NOT include code blocks, explanations, or metadata

## Question Quality Requirements
- Question content: 15-150 words per question
- Explanation: 20-100 words, must directly reference specific information from the document
- All 4 options must be:
  - Grammatically correct and complete sentences/phrases
  - Plausible (reasonable but incorrect options should seem credible)
  - Mutually exclusive (no overlap in meaning)
  - Similar in length and complexity (±30% variation)
- Correct answer must be unambiguously supported by the document
- Incorrect options (distractors) must be factually incorrect or irrelevant, not just "none of the above"

## Language & Style Requirements (CRITICAL - Consistency Required)
${languageSample ? `- **MANDATORY LANGUAGE CONSISTENCY**: The following is a sample from previously generated questions. You MUST generate ALL new questions in the EXACT SAME language, script, and writing style as this sample:

Sample from previous questions:
"${languageSample}"

Analyze the language, script, terminology, and style used in this sample, and replicate it precisely in all new questions. Do NOT switch languages, scripts, or styles.` : customInstruction && customInstruction.trim() ? `- **LANGUAGE PRIORITY**: 
  1. First priority: If custom instructions specify a language or are written in a specific language, detect and use that language
  2. Second priority: Match the document's primary language exactly
- **CRITICAL**: Once you determine the target language from custom instructions or document, you MUST use the SAME language for ALL questions in ALL batches. Do NOT switch languages between batches.` : `- **LANGUAGE DETECTION**: Analyze the document's language, script, and writing style. Match it exactly.
- **CRITICAL**: Once you determine the target language from the document, you MUST use the SAME language, script, and style for ALL questions in ALL batches. Do NOT switch languages between batches.`}
${previousSummary && previousSummary.trim() !== "No questions generated yet." && !languageSample ? `- **LANGUAGE CONSISTENCY CHECK**: Review the previously generated questions above. You MUST generate new questions in the EXACT SAME language, script, and style as those previous questions.` : ""}
- Use the same terminology, phrasing style, and formality level as the document (or as established in previous questions)
- Maintain consistent linguistic features (e.g., formal vs. informal, technical vs. general vocabulary)
- **ABSOLUTELY FORBIDDEN**: Do NOT include phrases like "According to the document", "Based on the provided document", "The document states", or any similar meta-references to the document in question content (in any language). Write questions naturally as if the information is general knowledge, not referencing a source.

## Topic Coverage Requirements
- Avoid repeating topics from previously generated questions (see Context section above)
- Distribute questions across different sections/concepts in the document
- Prioritize:
  1. Core concepts and definitions
  2. Relationships and cause-effect patterns
  3. Application and analysis-level understanding
  4. Specific facts, figures, or examples (when significant)
- Avoid trivial details or peripheral information
${customInstruction && customInstruction.trim() ? `\n## Custom Instructions (If Provided)\n=== USER-SPECIFIC REQUIREMENTS ===\n${customInstruction.trim()}\n\nApply these requirements while maintaining all schema and quality constraints above.\n` : ""}

# Process / Steps

Follow this process for each question:

1. **Identify Topic**: Select a distinct concept, fact, or relationship from the document that has not been covered in previous questions.

2. **Verify Answerability**: Confirm the document contains sufficient information to answer the question definitively. If not, skip this topic.

3. **Formulate Question**: Write a clear, unambiguous question stem that tests understanding (not just recall). Use question words: "What", "Which", "Why", "How", "When", "Where". Write questions naturally - DO NOT include phrases like "According to the document", "Based on the provided", "The document states", or any similar meta-references. The question should read as if testing general knowledge, not referencing a source.

4. **Determine Correct Answer**: Identify the single correct answer based exclusively on document content. Verify it is explicitly stated or clearly implied.

5. **Create Distractors**: Generate 3 incorrect options that are:
   - Factually wrong (contradict document) OR irrelevant (not addressed in document)
   - Plausible enough to challenge test-takers
   - Not obviously wrong at first glance

6. **Assign correctIdx**: Set correctIdx to 0, 1, 2, or 3 based on which option position contains the correct answer.

7. **Write Explanation**: Explain why the correct answer is right, citing specific document content. Keep it concise but informative.

8. **Assess Difficulty**: If the question requires simple recall, label "Easy". If it requires understanding relationships, label "Medium". If it requires analysis or synthesis, label "Hard". If unclear, omit the difficulty field.

9. **Validate**: Ensure the question meets all schema and quality requirements before including it.

# Output Format

Return ONLY a valid JSON array. No markdown, no code blocks, no explanations outside the array.

Example structure:
[
  {
    "content": "What is the primary purpose of X?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctIdx": 1,
    "explanation": "X serves to... [specific reference from document]",
    "difficulty": "Medium"
  },
  ...
]

**IMPORTANT**: Notice the question does NOT say "according to the document" - it's written naturally. The explanation can reference the document, but the question itself should not.

# Forbidden Behaviors

DO NOT:
- Include questions not answerable from the document
- Use external knowledge or assumptions beyond the document
- Repeat topics from previous questions
- Create questions with fewer or more than 4 options
- Use correctIdx values outside [0, 3]
- Include markdown formatting, code blocks, or prose outside JSON
- Generate questions about trivial or peripheral details
- Create "trick" questions that mislead through ambiguous wording
- Use "All of the above" or "None of the above" as options (unless explicitly appropriate)
- Include phrases like "According to the document", "Based on the provided", "The document states", "Trong tài liệu", "Theo tài liệu", or any meta-references to the document in question content
- Switch languages between batches - maintain the SAME language throughout ALL questions

# Edge-Case Handling

- If document is unclear or ambiguous on a topic, skip that topic
- If document lacks sufficient content for ${questionsNeeded} distinct questions, generate the maximum possible distinct questions
- If language cannot be determined: ${languageSample ? "use the language from the sample provided above (already established)" : customInstruction && customInstruction.trim() ? "analyze and use the language of the custom instructions" : "analyze and use the document's language"}
- If difficulty cannot be clearly assessed, omit the difficulty field
- **LANGUAGE CONSISTENCY**: ${languageSample ? "You MUST replicate the exact language, script, and style from the sample provided above. This is non-negotiable." : "Once you determine the language from custom instructions or document, maintain it consistently across ALL batches. Analyze linguistic features (script, vocabulary, grammar patterns) and replicate them precisely."}

# Final Instruction

Generate exactly ${questionsNeeded} questions following this prompt. Return ONLY the JSON array. Schema compliance is non-negotiable. Quality and non-repetition are critical.`;

    return prompt;
}

function buildContents(source: DocumentSource, prompt: string) {
    if (source.type === "text") {
        const truncatedContent =
            source.content.length > 20000
                ? `${source.content.slice(0, 20000)}\n...[truncated]`
                : source.content;

        return [
            {
                role: "user",
                parts: [
                    {
                        text: `${prompt}\n\nDocument Content:\n${truncatedContent}`,
                    },
                ],
            },
        ];
    }

    return [
        {
            role: "user",
            parts: [
                {
                    fileData: {
                        mimeType: source.mimeType,
                        fileUri: source.uri,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
    ];
}
