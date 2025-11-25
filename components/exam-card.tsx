import { Exam } from "@/types"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CalendarIcon, FileTextIcon, PencilIcon } from "lucide-react"

interface ExamCardProps {
    exam: Exam
}

export function ExamCard({ exam }: ExamCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1 text-lg">{exam.title}</CardTitle>
                    <Badge variant={exam.status === "published" ? "default" : "secondary"}>
                        {exam.status === "published" ? "Đã xuất bản" : "Nháp"}
                    </Badge>
                </div>
                <CardDescription className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {new Date(exam.createdAt).toLocaleDateString("vi-VN")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileTextIcon className="h-4 w-4" />
                    <span>Mã đề: {exam.code}</span>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                    {exam.questions.length} câu hỏi
                </div>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Link href={`/exam/${exam.code}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">
                        <PencilIcon className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                    </Button>
                </Link>
                <Link href={`/exam/${exam.code}`} className="flex-1">
                    <Button className="w-full">
                        Xem chi tiết
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    )
}
