import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ensureDbUser } from "@/lib/ensure-db-user"

/**
 * GET /api/sessions/[sessionId]
 * Get session details including exam and current answers
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
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

        const { sessionId } = await params
        const user = await ensureDbUser(userId)

        const session = await prisma.examSession.findUnique({
            where: { id: sessionId },
            include: {
                exam: {
                    include: {
                        questions: {
                            select: {
                                id: true,
                                content: true,
                                options: true,
                                // Don't include correctIdx or explanation during exam
                            },
                            orderBy: {
                                createdAt: "asc",
                            },
                        },
                    },
                },
            },
        })

        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Session not found",
                },
                { status: 404 }
            )
        }

        // Verify session belongs to user
        if (session.userId !== user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized access to this session",
                },
                { status: 403 }
            )
        }

        return NextResponse.json({
            success: true,
            data: {
                sessionId: session.id,
                startTime: session.startTime.toISOString(),
                endTime: session.endTime.toISOString(),
                answers: session.answers,
                isSubmitted: session.isSubmitted,
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
        console.error("Error fetching session:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch session",
            },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/sessions/[sessionId]
 * Auto-save answers (validates session is not expired)
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
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

        const { sessionId } = await params
        const user = await ensureDbUser(userId)
        const body = await request.json()
        const { answers } = body ?? {}

        if (!answers || typeof answers !== "object") {
            return NextResponse.json(
                {
                    success: false,
                    error: "Answers object is required",
                },
                { status: 400 }
            )
        }

        const session = await prisma.examSession.findUnique({
            where: { id: sessionId },
        })

        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Session not found",
                },
                { status: 404 }
            )
        }

        // Verify session belongs to user
        if (session.userId !== user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized access to this session",
                },
                { status: 403 }
            )
        }

        // Check if session is already submitted
        if (session.isSubmitted) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Session is already submitted",
                },
                { status: 400 }
            )
        }

        // Check if session is expired
        const now = new Date()
        if (now > session.endTime) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Session has expired",
                },
                { status: 400 }
            )
        }

        // Update answers
        const updatedSession = await prisma.examSession.update({
            where: { id: sessionId },
            data: {
                answers: answers,
            },
        })

        return NextResponse.json({
            success: true,
            data: {
                sessionId: updatedSession.id,
                answers: updatedSession.answers,
                updatedAt: updatedSession.updatedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error("Error auto-saving session:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to auto-save session",
            },
            { status: 500 }
        )
    }
}

