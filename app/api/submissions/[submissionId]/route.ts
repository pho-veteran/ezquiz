import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ensureDbUser } from "@/lib/ensure-db-user"

/**
 * GET /api/submissions/[submissionId]
 * Get submission details with exam and questions
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ submissionId: string }> }
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

        const { submissionId } = await params
        const user = await ensureDbUser(userId)

        const submission = await prisma.submission.findUnique({
            where: { id: submissionId },
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
        })

        if (!submission) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Submission not found",
                },
                { status: 404 }
            )
        }

        // Verify submission belongs to user
        if (submission.userId !== user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Unauthorized access to this submission",
                },
                { status: 403 }
            )
        }

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

