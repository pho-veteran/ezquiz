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
            const chunkPrompt = buildChunkPrompt(questionsThisChunk, previousSummary);
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
                parsedChunk = AIResponseSchema.parse(JSON.parse(responseText));
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

function buildChunkPrompt(
    questionsNeeded: number,
    previousSummary: string
): string {
    return `You are an expert exam creator. Generate ${questionsNeeded} new, non-overlapping multiple choice questions (MCQs) about the provided document.

Key requirements:
- Match the document's language exactly (e.g., Vietnamese document => Vietnamese questions).
- Avoid repeating topics already covered:
${previousSummary}
- Focus on high-value concepts and deeper understanding.
- Each question must have exactly 4 plausible options and one correct answer.
- Provide a brief explanation that references the document's ideas.
- Optionally label difficulty as Easy, Medium, or Hard when it is apparent.

Respond ONLY via the structured schema; do not include any prose outside of the schema.`;
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
