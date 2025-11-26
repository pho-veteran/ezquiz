import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { DEFAULT_EXAM_STATUS, EXAM_STATUSES, normalizeExamStatus } from "@/lib/exam-status"
import { validateQuestionsPayload } from "@/lib/exam-validation"

/**
 * GET /api/exams
 * Get all exams with their questions
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const statusParam = searchParams.get("status")
        const normalizedStatus = normalizeExamStatus(statusParam)

        if (statusParam && !normalizedStatus) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid status. Accepted values: ${EXAM_STATUSES.join(", ")}.`,
                },
                { status: 400 }
            )
        }

        const exams = await prisma.exam.findMany({
            where: normalizedStatus ? { status: normalizedStatus } : undefined,
            include: {
                questions: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        return NextResponse.json({
            success: true,
            data: exams,
            count: exams.length,
        })
    } catch (error) {
        console.error("Error fetching exams:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch exams",
            },
            { status: 500 }
        )
    }
}

/**
 * POST /api/exams
 * Create a new exam with questions
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { code, title, status, authorId, durationMinutes, questions } = body ?? {}

        const trimmedCode = typeof code === "string" ? code.trim() : ""
        const trimmedTitle = typeof title === "string" ? title.trim() : ""
        const normalizedStatus =
            status === undefined ? DEFAULT_EXAM_STATUS : normalizeExamStatus(status)

        const errors: string[] = []

        if (!trimmedCode) {
            errors.push("Exam code is required.")
        }

        if (!trimmedTitle) {
            errors.push("Exam title is required.")
        }

        if (status !== undefined && !normalizedStatus) {
            errors.push(`Invalid status. Accepted values: ${EXAM_STATUSES.join(", ")}.`)
        }

        if (authorId !== undefined && typeof authorId !== "string") {
            errors.push("authorId must be a string when provided.")
        }

        const { questions: validatedQuestions, errors: questionErrors } = validateQuestionsPayload(
            questions
        )

        if (questionErrors.length > 0) {
            errors.push(...questionErrors)
        }

        if (errors.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: errors.join(" "),
                },
                { status: 400 }
            )
        }

        // Check if exam code already exists
        const existingExam = await prisma.exam.findUnique({
            where: { code: trimmedCode },
        })

        if (existingExam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam code already exists",
                },
                { status: 409 }
            )
        }

        const exam = await prisma.exam.create({
            data: {
                code: trimmedCode,
                title: trimmedTitle,
                status: normalizedStatus ?? DEFAULT_EXAM_STATUS,
                ...(authorId && { authorId }),
                ...(durationMinutes !== undefined && {
                    durationMinutes:
                        durationMinutes === null || durationMinutes === ""
                            ? null
                            : typeof durationMinutes === "number" && durationMinutes > 0
                              ? durationMinutes
                              : null,
                }),
                ...(validatedQuestions.length > 0 && {
                    questions: {
                        create: validatedQuestions.map((question) => ({
                            content: question.content,
                            options: question.options,
                            correctIdx: question.correctIdx,
                            explanation: question.explanation ?? "",
                        })),
                    },
                }),
            },
            include: {
                questions: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        return NextResponse.json(
            {
                success: true,
                data: exam,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error("Error creating exam:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create exam",
            },
            { status: 500 }
        )
    }
}
