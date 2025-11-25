import { MOCK_EXAMS } from "@/lib/mock-data"
import { ExamCard } from "@/components/exam-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

export default function DashboardPage() {
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
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {MOCK_EXAMS.map((exam) => (
                    <ExamCard key={exam.id} exam={exam} />
                ))}
            </div>
        </div>
    )
}
