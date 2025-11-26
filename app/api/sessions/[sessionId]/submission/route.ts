import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ensureDbUser } from "@/lib/ensure-db-user"

/**
 * GET /api/sessions/[sessionId]/submission
 * Get submission for a session
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
                submission: {
                    include: {
                        exam: {
                            include: {
                                questions: {
                                    orderBy: {
                                        createdAt: "asc",
                                    },
                                },
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

        if (!session.submission) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Submission not found for this session",
                },
                { status: 404 }
            )
        }

        const submission = session.submission

        return NextResponse.json({
            success: true,
            data: {
                id: submission.id,
                answers: submission.answers,
                score: submission.score,
                timeSpent: submission.timeSpent,
                submittedAt: submission.submittedAt.toISOString(),
                exam: {
                    id: submission.exam.id,
                    code: submission.exam.code,
                    title: submission.exam.title,
                    questions: submission.exam.questions.map((q) => ({
                        id: q.id,
                        content: q.content,
                        options: q.options,
                        correctIdx: q.correctIdx,
                        explanation: q.explanation,
                    })),
                },
            },
        })
    } catch (error) {
        console.error("Error fetching submission:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch submission",
            },
            { status: 500 }
        )
    }
}

