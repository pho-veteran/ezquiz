import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ensureDbUser } from "@/lib/ensure-db-user"
import { calculateScore } from "@/lib/submission-utils"

/**
 * POST /api/sessions/[sessionId]/submit
 * Submit exam session and create submission
 */
export async function POST(
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
                        questions: true,
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

        // Check if already submitted
        if (session.isSubmitted) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Session is already submitted",
                },
                { status: 400 }
            )
        }

        const now = new Date()
        const isExpired = now > session.endTime
        const timeSpentSeconds = Math.floor(
            (now.getTime() - session.startTime.getTime()) / 1000
        )

        // Get answers from request body or use saved answers
        const body = await request.json()
        const answers =
            body?.answers && typeof body.answers === "object"
                ? body.answers
                : (session.answers as Record<string, number> | null) ?? {}

        // Calculate score
        const scoreResult = calculateScore(session.exam, answers)

        // Create submission in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create submission
            const submission = await tx.submission.create({
                data: {
                    examId: session.examId,
                    userId: user.id,
                    sessionId: session.id,
                    answers: answers,
                    score: scoreResult.score,
                    timeSpent: timeSpentSeconds,
                    submittedAt: now,
                },
            })

            // Mark session as submitted
            await tx.examSession.update({
                where: { id: sessionId },
                data: {
                    isSubmitted: true,
                },
            })

            return submission
        })

        return NextResponse.json({
            success: true,
            data: {
                submissionId: result.id,
                sessionId: session.id,
                score: scoreResult.score,
                correctCount: scoreResult.correctCount,
                total: scoreResult.total,
                percentage: scoreResult.percentage,
                timeSpent: timeSpentSeconds,
                isExpired,
                submittedAt: result.submittedAt.toISOString(),
            },
        })
    } catch (error) {
        console.error("Error submitting session:", error)
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to submit session",
            },
            { status: 500 }
        )
    }
}

