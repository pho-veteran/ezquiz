import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { uploadFileToGemini, extractTextFromFile } from "@/lib/google-ai";
import { AIResponseSchema } from "@/lib/zod-schema";
import { ensureDbUser } from "@/lib/ensure-db-user";

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
        const numQuestions =
            parseInt(formData.get("numQuestions") as string) || 10;

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

        if (numQuestions < 1 || numQuestions > 50) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Number of questions must be between 1 and 50.",
                },
                { status: 400 }
            );
        }

        // 3. Upload file to Gemini or extract text
        let fileUri: string | undefined;
        let fileMimeType: string;
        let textContent: string | undefined;

        if (file.type === "text/plain") {
            // For text files, extract content directly
            textContent = await extractTextFromFile(file);
            fileMimeType = file.type;
        } else {
            // For other files (PDF, DOCX, Images), upload to Gemini
            const uploadResult = await uploadFileToGemini(file);
            fileUri = uploadResult.uri;
            fileMimeType = uploadResult.mimeType;
        }

        // 4. Generate questions using AI
        // Initialize model with JSON response configuration
        const { genAI } = await import("@/lib/google-ai");
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        // Construct the prompt for AI
        const prompt = `You are an expert exam creator and instructional designer. Your task is to analyze the provided document and generate ${numQuestions} high-quality multiple choice questions (MCQ).

IMPORTANT: Use the same language as the source document. If the document is in Vietnamese, generate questions in Vietnamese. If it's in English, use English. Match the language naturally.

Guidelines for creating excellent MCQs:

1. Content Coverage: Focus on the main concepts, key ideas, and important information from the document. Avoid trivial details.

2. Question Quality:
   - Questions should test understanding, not just memorization
   - Be clear, concise, and unambiguous
   - Avoid negative phrasing when possible

3. Answer Options:
   - Provide exactly 4 options (A, B, C, D)
   - Create plausible distractors (wrong answers that seem reasonable)
   - Distractors should be related to the topic and have similar length/complexity
   - NEVER use options like "All of the above" or "None of the above"
   - Avoid patterns in correct answer placement

4. Explanations:
   - Provide a brief, clear explanation for why the correct answer is right
   - Reference the document content when possible
   - Help learners understand the concept

Return your response as a JSON array following this exact structure:
[
  {
    "content": "The question text here?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctIdx": 0,
    "explanation": "Explanation of why this answer is correct"
  }
]

Generate ${numQuestions} questions now.`;

        let response;

        if (textContent) {
            // For text content, send it directly in the prompt
            response = await model.generateContent([
                {
                    text: `${prompt}\n\nDocument Content:\n${textContent}`,
                },
            ]);
        } else if (fileUri) {
            // For uploaded files, reference the file URI
            response = await model.generateContent([
                {
                    fileData: {
                        mimeType: fileMimeType,
                        fileUri: fileUri,
                    },
                },
                { text: prompt },
            ]);
        } else {
            throw new Error("No file content available for processing");
        }

        const responseText = response.response.text();

        if (!responseText) {
            throw new Error("AI generated empty response");
        }

        // 5. Parse and validate AI response
        let rawData;
        try {
            rawData = JSON.parse(responseText);
        } catch {
            console.error("Failed to parse AI response as JSON:", responseText);
            throw new Error(
                "AI returned invalid JSON format. Please try again."
            );
        }

        const validationResult = AIResponseSchema.safeParse(rawData);

        if (!validationResult.success) {
            console.error(
                "AI output validation failed:",
                validationResult.error
            );
            throw new Error(
                "AI generated questions don't match expected format. Please try again."
            );
        }

        const questions = validationResult.data;

        // 6. Save to database
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

        // 7. Return success response
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
