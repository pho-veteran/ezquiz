import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { ensureDbUser } from "@/lib/ensure-db-user"

/**
 * GET /api/sessions/[sessionId]/heartbeat
 * Get server time and remaining time for session
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

        const now = new Date()
        const timeRemainingMs = session.endTime.getTime() - now.getTime()
        const timeRemainingSeconds = Math.max(0, Math.floor(timeRemainingMs / 1000))

        return NextResponse.json({
            success: true,
            data: {
                serverTime: now.toISOString(),
                endTime: session.endTime.toISOString(),
                timeRemainingSeconds,
                isExpired: timeRemainingSeconds <= 0,
                isSubmitted: session.isSubmitted,
            },
        })
    } catch (error) {
        console.error("Error in heartbeat:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to get heartbeat",
            },
            { status: 500 }
        )
    }
}

