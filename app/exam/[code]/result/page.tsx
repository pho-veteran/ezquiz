"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle, RefreshCcw, Home } from "lucide-react"

export default function ResultPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const score = parseInt(searchParams.get("score") || "0")
    const total = parseInt(searchParams.get("total") || "10")
    const percentage = Math.round((score / total) * 100)

    let message = ""
    let colorClass = ""

    if (percentage >= 80) {
        message = "Xuất sắc! Bạn đã nắm vững kiến thức."
        colorClass = "text-green-600"
    } else if (percentage >= 50) {
        message = "Khá tốt! Hãy cố gắng hơn nữa nhé."
        colorClass = "text-blue-600"
    } else {
        message = "Cần ôn tập thêm! Đừng nản lòng."
        colorClass = "text-orange-600"
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <CardTitle className="text-2xl">Kết Quả Bài Thi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="relative pt-4">
                        <div className={`text-6xl font-bold ${colorClass} mb-2`}>
                            {score}/{total}
                        </div>
                        <p className="text-muted-foreground font-medium">{message}</p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span>Điểm số</span>
                            <span className="font-bold">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-3" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-700">Đúng</span>
                            </div>
                            <span className="text-2xl font-bold text-green-800">{score}</span>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg">
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="font-semibold text-red-700">Sai</span>
                            </div>
                            <span className="text-2xl font-bold text-red-800">{total - score}</span>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button className="w-full" onClick={() => router.push("/join")}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Làm bài thi khác
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                        <Home className="mr-2 h-4 w-4" />
                        Về trang chủ
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
