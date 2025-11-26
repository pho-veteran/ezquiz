import { ExamCard } from "@/components/exam-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ensureDbUser } from "@/lib/ensure-db-user"

export default async function DashboardPage() {
    const { userId } = await auth()
    
    if (!userId) {
        redirect("/sign-in")
    }

    await ensureDbUser(userId)

    const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
            exams: {
                include: {
                    questions: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    })

    if (!user) {
        throw new Error("Unable to load user profile")
    }

    // Transform database exams to match Exam interface
    const exams = user.exams.map((exam: typeof user.exams[number]) => ({
        id: exam.id,
        code: exam.code,
        title: exam.title,
        createdAt: exam.createdAt.toISOString(),
        status: exam.status as "DRAFT" | "PUBLISHED" | "ENDED",
        questions: exam.questions.map((q: typeof exam.questions[number]) => ({
            id: q.id,
            content: q.content,
            options: q.options as string[],
            correctIdx: q.correctIdx,
            explanation: q.explanation || undefined
        }))
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Đề thi của tôi</h1>
                <Link href="/create-exam">
                    <Button>
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Tạo đề thi mới
                    </Button>
                </Link>
            </div>
            {exams.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        Chưa có đề thi nào. Hãy tạo đề thi đầu tiên của bạn!
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {exams.map((exam: typeof exams[number]) => (
                        <ExamCard key={exam.id} exam={exam} />
                    ))}
                </div>
            )}
        </div>
    )
}
