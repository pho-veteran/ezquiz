import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ensureDbUser } from "@/lib/ensure-db-user"
import { EXAM_STATUSES } from "@/lib/exam-status"

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

function isValidObjectId(value?: string | null): value is string {
    return typeof value === "string" && OBJECT_ID_REGEX.test(value)
}

function resolveExamIdentifier(paramsId?: string): { field: "id" | "code"; value: string } | null {
    const trimmedParam = paramsId?.trim()
    
    if (isValidObjectId(trimmedParam)) {
        return { field: "id", value: trimmedParam }
    }
    
    if (trimmedParam) {
        return { field: "code", value: trimmedParam }
    }
    
    return null
}

/**
 * POST /api/exams/[id]/sessions
 * Create a new exam session for the authenticated user
 * Only allows PUBLISHED exams
 * Supports both exam ID and code
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized. Please sign in to take exams.",
                },
                { status: 401 }
            )
        }

        const { id } = await params
        const identifier = resolveExamIdentifier(id)
        
        if (!identifier) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid exam identifier",
                },
                { status: 400 }
            )
        }

        const user = await ensureDbUser(userId)

        // Find exam by id or code
        const exam = await prisma.exam.findUnique({
            where: identifier.field === "id" ? { id: identifier.value } : { code: identifier.value },
            include: {
                questions: true,
            },
        })

        if (!exam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            )
        }

        // Only allow PUBLISHED exams
        if (exam.status !== "PUBLISHED") {
            return NextResponse.json(
                {
                    success: false,
                    error: `Exam is not available. Current status: ${exam.status}. Only ${EXAM_STATUSES[1]} exams can be taken.`,
                },
                { status: 403 }
            )
        }

        if (!exam.durationMinutes || exam.durationMinutes <= 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam does not have a valid duration configured.",
                },
                { status: 400 }
            )
        }

        // Calculate end time
        const startTime = new Date()
        const endTime = new Date(
            startTime.getTime() + exam.durationMinutes * 60 * 1000
        )

        // Create session
        const session = await prisma.examSession.create({
            data: {
                examId: exam.id,
                userId: user.id,
                startTime,
                endTime,
                answers: {},
                isSubmitted: false,
            },
            include: {
                exam: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        durationMinutes: true,
                        questions: {
                            select: {
                                id: true,
                                content: true,
                                options: true,
                                // Don't include correctIdx or explanation during exam
                            },
                        },
                    },
                },
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                sessionId: session.id,
                startTime: session.startTime.toISOString(),
                endTime: session.endTime.toISOString(),
                exam: {
                    id: session.exam.id,
                    code: session.exam.code,
                    title: session.exam.title,
                    durationMinutes: session.exam.durationMinutes,
                    questions: session.exam.questions,
                },
            },
        })
    } catch (error) {
        console.error("Error creating exam session:", error)
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to create exam session",
            },
            { status: 500 }
        )
    }
}

/**
 * GET /api/exams/[id]/sessions
 * Get user's attempt history for this exam
 * Supports both exam ID and code
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized",
                },
                { status: 401 }
            )
        }

        const { id } = await params
        const identifier = resolveExamIdentifier(id)
        
        if (!identifier) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid exam identifier",
                },
                { status: 400 }
            )
        }

        const user = await ensureDbUser(userId)

        // Find exam by id or code
        const exam = await prisma.exam.findUnique({
            where: identifier.field === "id" ? { id: identifier.value } : { code: identifier.value },
            select: { id: true },
        })

        if (!exam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            )
        }

        // Get user's sessions for this exam
        const sessions = await prisma.examSession.findMany({
            where: {
                examId: exam.id,
                userId: user.id,
            },
            include: {
                submission: {
                    select: {
                        id: true,
                        score: true,
                        timeSpent: true,
                        submittedAt: true,
                    },
                },
            },
            orderBy: {
                startTime: "desc",
            },
        })

        const history = sessions.map((session) => ({
            sessionId: session.id,
            startTime: session.startTime.toISOString(),
            endTime: session.endTime.toISOString(),
            isSubmitted: session.isSubmitted,
            score: session.submission?.score ?? null,
            timeSpent: session.submission?.timeSpent ?? null,
            submittedAt: session.submission?.submittedAt?.toISOString() ?? null,
        }))

        return NextResponse.json({
            success: true,
            data: history,
        })
    } catch (error) {
        console.error("Error fetching exam sessions:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch exam sessions",
            },
            { status: 500 }
        )
    }
}

