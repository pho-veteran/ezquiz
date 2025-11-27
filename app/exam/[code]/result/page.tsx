"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSearchParams, useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
    CheckCircle2,
    XCircle,
    RefreshCcw,
    Home,
    AlertCircle,
    Clock,
    Loader2,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface Question {
    id: string
    content: string
    options: string[]
    correctIdx: number
    explanation?: string | null
}

interface SubmissionData {
    id: string
    answers: Record<string, number>
    score: number | null
    timeSpent: number | null
    submittedAt: string
    exam: {
        id: string
        code: string
        title: string
        questions: Question[]
    }
}

interface AttemptHistory {
    sessionId: string
    startTime: string
    endTime: string
    isSubmitted: boolean
    score: number | null
    timeSpent: number | null
    submittedAt: string | null
}

export default function ResultPage() {
    const params = useParams<{ code: string }>()
    const searchParams = useSearchParams()
    const router = useRouter()
    const examCode = params.code

    const [submissionData, setSubmissionData] =
        useState<SubmissionData | null>(null)
    const [history, setHistory] = useState<AttemptHistory[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Create refs for scrolling to questions - must be at top level
    const questionRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const fetchSubmission = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            const sessionId = searchParams.get("sessionId")
            const submissionId = searchParams.get("submissionId")

            let response

            if (sessionId) {
                response = await apiClient.get(
                    `/sessions/${sessionId}/submission`
                )
            } else if (submissionId) {
                response = await apiClient.get(`/submissions/${submissionId}`)
            } else {
                throw new Error("Missing sessionId or submissionId")
            }

            if (!response.data.success || !response.data.data) {
                throw new Error(
                    response.data.error || "Failed to load submission"
                )
            }

            setSubmissionData(response.data.data)

            // Fetch attempt history
            try {
                const historyRes = await apiClient.get(
                    `/exams/${examCode}/sessions`
                )
                if (historyRes.data.success && historyRes.data.data) {
                    setHistory(historyRes.data.data)
                }
            } catch (err) {
                console.error("Error fetching history:", err)
                // Don't fail the whole page if history fails
            }
        } catch (err) {
            console.error("Error fetching submission:", err)
            setError(
                err instanceof Error
                    ? err.message
                    : "Không thể tải kết quả"
            )
            toast.error("Không thể tải kết quả bài thi")
        } finally {
            setIsLoading(false)
        }
    }, [searchParams, examCode])

    useEffect(() => {
        fetchSubmission()
    }, [fetchSubmission])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Đang tải kết quả...</p>
                </div>
            </div>
        )
    }

    if (error || !submissionData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center space-y-4">
                        <p className="text-destructive">{error || "Không tìm thấy kết quả"}</p>
                        <div className="flex gap-2 justify-center">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/join")}
                            >
                                Về trang chủ
                            </Button>
                            <Button onClick={fetchSubmission}>Thử lại</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const { exam, answers, score, timeSpent } = submissionData
    const total = exam.questions.length
    const correctCount = exam.questions.filter(
        (q) => answers[q.id] === q.correctIdx
    ).length
    const percentage = score ?? 0

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

    const scrollToQuestion = (questionId: string) => {
        const element = questionRefs.current[questionId]
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

    const formatTime = (seconds: number | null) => {
        if (!seconds) return "N/A"
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        if (mins === 0) {
            return `${secs} giây`
        }
        if (secs === 0) {
            return `${mins} phút`
        }
        return `${mins} phút ${secs} giây`
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Column: Summary */}
                    <div className="lg:col-span-1 space-y-4">
                        <Card>
                    <CardHeader>
                                <CardTitle className="text-xl text-center">
                                    Kết Quả Bài Thi
                                </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center">
                                    <div
                                        className={`text-5xl font-bold ${colorClass} mb-2`}
                                    >
                                {correctCount}/{total}
                            </div>
                                    <p className="text-muted-foreground font-medium">
                                        {message}
                                    </p>
                        </div>

                                <Separator />

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Điểm số</span>
                                        <span className="font-bold">
                                            {percentage.toFixed(1)}%
                                        </span>
                            </div>
                            <Progress value={percentage} className="h-3" />
                        </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-green-50 p-3 rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            <span className="text-xs font-semibold text-green-700">
                                                Đúng
                                            </span>
                                        </div>
                                        <span className="text-xl font-bold text-green-800 block">
                                            {correctCount}
                                        </span>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-1 mb-1">
                                            <XCircle className="w-4 h-4 text-red-600" />
                                            <span className="text-xs font-semibold text-red-700">
                                                Sai
                                            </span>
                                        </div>
                                        <span className="text-xl font-bold text-red-800 block">
                                            {total - correctCount}
                                        </span>
                                    </div>
                                </div>

                                {timeSpent && (
                                    <>
                                        <Separator />
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-muted-foreground">
                                                Thời gian làm bài:
                                            </span>
                                            <span className="font-semibold">
                                                {formatTime(timeSpent)}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Attempt History */}
                                {history.length > 0 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold">
                                                Lịch sử làm bài
                                            </p>
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {history.map((attempt, index) => (
                                                    <div
                                                        key={attempt.sessionId}
                                                        className={cn(
                                                            "rounded-lg border p-2 text-xs",
                                                            attempt.isSubmitted
                                                                ? "bg-green-50 border-green-200"
                                                                : "bg-gray-50 border-gray-200"
                                                        )}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-medium">
                                                                Lần {history.length - index}
                                                            </span>
                                                            {attempt.isSubmitted &&
                                                                attempt.score !== null && (
                                                                    <span className="font-semibold text-green-700">
                                                                        {attempt.score.toFixed(
                                                                            1
                                                                        )}%
                                                                    </span>
                                                                )}
                                                        </div>
                                                        <p className="text-muted-foreground">
                                                            {attempt.submittedAt
                                                                ? formatDate(
                                                                      attempt.submittedAt
                                                                  )
                                                                : formatDate(
                                                                      attempt.startTime
                                                                  )}
                                                        </p>
                                                        {attempt.isSubmitted &&
                                                            attempt.timeSpent && (
                                                                <p className="text-xs text-muted-foreground mt-1">
                                                                    Thời gian:{" "}
                                                                    {formatTime(
                                                                        attempt.timeSpent
                                                                    )}
                                                                </p>
                                                            )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}

                                <Separator />

                                <div className="flex flex-col gap-2">
                                    <Button
                                        onClick={() =>
                                            router.push(`/exam/${examCode}`)
                                        }
                                        className="w-full"
                                    >
                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                        Làm lại
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push("/join")}
                                        className="w-full"
                                    >
                                        <Home className="mr-2 h-4 w-4" />
                                        Về trang chủ
                                    </Button>
                            </div>
                            </CardContent>
                        </Card>

                        {/* Question Navigation - Sticky */}
                        <Card className="sticky top-4 z-10">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">
                                    Danh sách câu hỏi
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-5 gap-2">
                                    {exam.questions.map((q, index) => {
                                        const userAns = answers[q.id]
                                        const isCorrectAnswer =
                                            userAns === q.correctIdx
                                        const hasUserAnswer =
                                            userAns !== undefined

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() =>
                                                    scrollToQuestion(q.id)
                                                }
                                                className={cn(
                                                    "aspect-square rounded-md flex items-center justify-center text-sm font-semibold transition-all hover:scale-105 active:scale-95",
                                                    isCorrectAnswer
                                                        ? "bg-green-500 text-white hover:bg-green-600 shadow-md"
                                                        : hasUserAnswer
                                                          ? "bg-red-500 text-white hover:bg-red-600 shadow-md"
                                                          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                                                )}
                                                title={`Câu ${index + 1}${
                                                    isCorrectAnswer
                                                        ? " - Đúng"
                                                        : hasUserAnswer
                                                          ? " - Sai"
                                                          : " - Chưa trả lời"
                                                }`}
                                            >
                                                {index + 1}
                                            </button>
                                        )
                                    })}
                                </div>
                                <div className="mt-4 pt-4 border-t space-y-2 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-green-500"></div>
                                        <span className="text-muted-foreground">
                                            Đúng
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-red-500"></div>
                                        <span className="text-muted-foreground">
                                            Sai
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded bg-gray-200"></div>
                                        <span className="text-muted-foreground">
                                            Chưa trả lời
                                        </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                    </div>

                    {/* Right Column: All Questions */}
                    <div className="lg:col-span-2 space-y-4">
                        {exam.questions.map((question, index) => {
                            const userAnswer = answers[question.id]
                            const isCorrect =
                                userAnswer === question.correctIdx
                        const hasAnswer = userAnswer !== undefined

                        return (
                                <div
                                    key={question.id}
                                    ref={(el) => {
                                        questionRefs.current[question.id] = el
                                    }}
                                    className="scroll-mt-4"
                                >
                                    <Card
                                        className={cn(
                                "border-2",
                                            isCorrect
                                                ? "border-green-500"
                                                : hasAnswer
                                                  ? "border-red-500"
                                                  : "border-gray-200"
                                        )}
                                    >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                                <div
                                                    className={cn(
                                            "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                                                        isCorrect
                                                            ? "bg-green-500 text-white"
                                                            : hasAnswer
                                                              ? "bg-red-500 text-white"
                                                              : "bg-gray-200 text-gray-600"
                                                    )}
                                                >
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <CardTitle className="text-base font-medium">
                                                {question.content}
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
                                                {question.options.map(
                                                    (option, optionIndex) => {
                                                        const isUserAnswer =
                                                            userAnswer ===
                                                            optionIndex
                                                        const isCorrectAnswer =
                                                            question.correctIdx ===
                                                            optionIndex

                                            return (
                                                <div
                                                    key={optionIndex}
                                                    className={cn(
                                                        "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                                                                    isCorrectAnswer &&
                                                                        "border-green-500 bg-green-50",
                                                                    isUserAnswer &&
                                                                        !isCorrectAnswer &&
                                                                        "border-red-500 bg-red-50",
                                                                    !isCorrectAnswer &&
                                                                        !isUserAnswer &&
                                                                        "border-gray-200"
                                                    )}
                                                >
                                                                <div
                                                                    className={cn(
                                                        "shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-semibold",
                                                                        isCorrectAnswer &&
                                                                            "border-green-500 bg-green-500 text-white",
                                                                        isUserAnswer &&
                                                                            !isCorrectAnswer &&
                                                                            "border-red-500 bg-red-500 text-white",
                                                                        !isCorrectAnswer &&
                                                                            !isUserAnswer &&
                                                                            "border-gray-300 text-gray-600"
                                                                    )}
                                                                >
                                                                    {String.fromCharCode(
                                                                        65 +
                                                                            optionIndex
                                                                    )}
                                                    </div>
                                                    <div className="flex-1">
                                                                    <span
                                                                        className={cn(
                                                                            isCorrectAnswer &&
                                                                                "font-semibold text-green-700",
                                                                            isUserAnswer &&
                                                                                !isCorrectAnswer &&
                                                                                "font-semibold text-red-700"
                                                                        )}
                                                                    >
                                                                        {
                                                                            option
                                                                        }
                                                        </span>
                                                    </div>
                                                    {isCorrectAnswer && (
                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                    )}
                                                                {isUserAnswer &&
                                                                    !isCorrectAnswer && (
                                                        <XCircle className="h-5 w-5 text-red-600" />
                                                    )}
                                                </div>
                                            )
                                                    }
                                                )}
                                    </div>

                                    {/* Explanation */}
                                    {question.explanation && (
                                        <>
                                            <Separator />
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                                <div className="flex items-start gap-2">
                                                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                                    <div>
                                                                <p className="font-semibold text-blue-900 mb-1">
                                                                    Giải thích:
                                                                </p>
                                                                <p className="text-sm text-blue-800">
                                                                    {
                                                                        question.explanation
                                                                    }
                                                                </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                                </div>
                        )
                    })}
                    </div>
                </div>
            </div>
        </div>
    )
}
