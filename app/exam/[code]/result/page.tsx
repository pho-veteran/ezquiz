"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, XCircle, RefreshCcw, Home, AlertCircle } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Mock exam data with explanations
const MOCK_EXAM_DATA = {
    title: "Kiểm tra kiến thức chung",
    questions: Array.from({ length: 10 }, (_, i) => ({
        id: `q${i + 1}`,
        text: `Câu ${i + 1}: Đây là nội dung câu hỏi số ${i + 1}?`,
        options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: i % 2 === 0 ? `Giải thích cho câu ${i + 1}: Đây là lý do tại sao đáp án ${String.fromCharCode(65 + Math.floor(Math.random() * 4))} là đúng. Bạn cần nắm vững kiến thức về phần này để trả lời chính xác.` : undefined
    }))
}

// Mock user answers
const MOCK_USER_ANSWERS: Record<string, number> = {
    "q1": 0,
    "q2": 1,
    "q3": 2,
    "q4": 0,
    "q5": 3,
    "q6": 1,
    "q7": 2,
    "q8": 0,
    "q9": 1,
    "q10": 3,
}

export default function ResultPage() {
    const searchParams = useSearchParams()
    const router = useRouter()

    const score = parseInt(searchParams.get("score") || "0")
    const total = parseInt(searchParams.get("total") || "10")
    const percentage = Math.round((score / total) * 100)

    // Calculate correct answers
    const correctCount = MOCK_EXAM_DATA.questions.filter(
        (q) => MOCK_USER_ANSWERS[q.id] === q.correctAnswer
    ).length

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
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto p-4 max-w-4xl">
                {/* Summary Card */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-2xl text-center">Kết Quả Bài Thi</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center">
                            <div className={`text-6xl font-bold ${colorClass} mb-2`}>
                                {correctCount}/{total}
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
                                <span className="text-2xl font-bold text-green-800 block text-center">{correctCount}</span>
                            </div>
                            <div className="bg-red-50 p-4 rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    <span className="font-semibold text-red-700">Sai</span>
                                </div>
                                <span className="text-2xl font-bold text-red-800 block text-center">{total - correctCount}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Results */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Chi tiết câu trả lời</h2>

                    {MOCK_EXAM_DATA.questions.map((question, index) => {
                        const userAnswer = MOCK_USER_ANSWERS[question.id]
                        const isCorrect = userAnswer === question.correctAnswer
                        const hasAnswer = userAnswer !== undefined

                        return (
                            <Card key={question.id} className={cn(
                                "border-2",
                                isCorrect ? "border-green-500" : hasAnswer ? "border-red-500" : "border-gray-200"
                            )}>
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                                            isCorrect ? "bg-green-500 text-white" : hasAnswer ? "bg-red-500 text-white" : "bg-gray-200 text-gray-600"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-base font-medium">
                                                {question.text}
                                            </CardTitle>
                                            <div className="flex items-center gap-2 mt-2">
                                                {isCorrect ? (
                                                    <span className="text-sm text-green-600 flex items-center gap-1 font-medium">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Chính xác
                                                    </span>
                                                ) : hasAnswer ? (
                                                    <span className="text-sm text-red-600 flex items-center gap-1 font-medium">
                                                        <XCircle className="h-4 w-4" />
                                                        Sai
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-gray-500 flex items-center gap-1 font-medium">
                                                        <AlertCircle className="h-4 w-4" />
                                                        Chưa trả lời
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Options */}
                                    <div className="space-y-2">
                                        {question.options.map((option, optionIndex) => {
                                            const isUserAnswer = userAnswer === optionIndex
                                            const isCorrectAnswer = question.correctAnswer === optionIndex

                                            return (
                                                <div
                                                    key={optionIndex}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                                                        isCorrectAnswer && "border-green-500 bg-green-50",
                                                        isUserAnswer && !isCorrectAnswer && "border-red-500 bg-red-50",
                                                        !isCorrectAnswer && !isUserAnswer && "border-gray-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold",
                                                        isCorrectAnswer && "border-green-500 bg-green-500 text-white",
                                                        isUserAnswer && !isCorrectAnswer && "border-red-500 bg-red-500 text-white",
                                                        !isCorrectAnswer && !isUserAnswer && "border-gray-300 text-gray-600"
                                                    )}>
                                                        {String.fromCharCode(65 + optionIndex)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <span className={cn(
                                                            isCorrectAnswer && "font-semibold text-green-700",
                                                            isUserAnswer && !isCorrectAnswer && "font-semibold text-red-700"
                                                        )}>
                                                            {option}
                                                        </span>
                                                    </div>
                                                    {isCorrectAnswer && (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    )}
                                                    {isUserAnswer && !isCorrectAnswer && (
                                                        <XCircle className="h-5 w-5 text-red-600" />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Explanation */}
                                    {question.explanation && (
                                        <>
                                            <Separator />
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-blue-900 mb-1">Giải thích:</p>
                                                        <p className="text-sm text-blue-800">{question.explanation}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Action Buttons */}
                <Card className="mt-6 sticky bottom-4 shadow-lg">
                    <CardContent className="py-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button className="flex-1" onClick={() => router.push("/join")}>
                                <RefreshCcw className="mr-2 h-4 w-4" />
                                Làm bài thi khác
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
                                <Home className="mr-2 h-4 w-4" />
                                Về trang chủ
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
