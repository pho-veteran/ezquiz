"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Clock, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ExamConfirmationModalProps {
    examCode: string
    onClose: () => void
}

interface ExamInfo {
    title: string
    durationMinutes: number | null
    questionCount: number
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

export function ExamConfirmationModal({
    examCode,
    onClose,
}: ExamConfirmationModalProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isCreating, setIsCreating] = useState(false)
    const [examInfo, setExamInfo] = useState<ExamInfo | null>(null)
    const [history, setHistory] = useState<AttemptHistory[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Fetch exam info and history
                const [examRes, historyRes] = await Promise.all([
                    apiClient.get(`/exams/${examCode}`),
                    apiClient.get(`/exams/${examCode}/sessions`),
                ])

                if (!examRes.data.success || !examRes.data.data) {
                    throw new Error("Failed to load exam information")
                }

                const exam = examRes.data.data
                setExamInfo({
                    title: exam.title,
                    durationMinutes: exam.durationMinutes,
                    questionCount: exam.questions?.length ?? 0,
                })

                if (historyRes.data.success && historyRes.data.data) {
                    setHistory(historyRes.data.data)
                }
            } catch (err) {
                console.error("Error fetching exam data:", err)
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load exam information"
                )
                toast.error("Không thể tải thông tin đề thi")
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [examCode])

    const handleStartExam = async () => {
        try {
            setIsCreating(true)
            setError(null)

            const response = await apiClient.post(`/exams/${examCode}/sessions`)

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error || "Failed to create session")
            }

            const { sessionId } = response.data.data
            toast.success("Đã tạo phiên làm bài!")
            router.push(`/exam/session/${sessionId}`)
        } catch (err) {
            console.error("Error creating session:", err)
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Không thể tạo phiên làm bài"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsCreating(false)
        }
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

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "Không giới hạn"
        if (minutes < 60) return `${minutes} phút 0 giây`
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return mins > 0 ? `${hours} giờ ${mins} phút 0 giây` : `${hours} giờ 0 phút 0 giây`
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <CardTitle>Xác nhận làm bài</CardTitle>
                    <CardDescription>
                        Vui lòng xem lại thông tin đề thi và lịch sử làm bài trước
                        khi bắt đầu
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                            <p className="text-sm font-medium text-red-900">
                                {error}
                            </p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={onClose}
                            >
                                Đóng
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Exam Info */}
                            {examInfo && (
                                <div className="space-y-4 rounded-lg border bg-gray-50 p-4">
                                    <h3 className="font-semibold text-lg">
                                        Thông tin đề thi
                                    </h3>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">
                                                    Tên đề thi
                                                </p>
                                                <p className="font-medium">
                                                    {examInfo.title}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">
                                                    Thời gian làm bài
                                                </p>
                                                <p className="font-medium">
                                                    {formatDuration(
                                                        examInfo.durationMinutes
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">
                                                    Số câu hỏi
                                                </p>
                                                <p className="font-medium">
                                                    {examInfo.questionCount} câu
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Warning if no duration */}
                            {examInfo && (!examInfo.durationMinutes || examInfo.durationMinutes <= 0) && (
                                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-yellow-900">
                                                Đề thi chưa có thời gian làm bài
                                            </p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                                Đề thi này chưa được cấu hình thời gian làm bài. Vui lòng liên hệ giáo viên để cập nhật thông tin.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Separator />

                            {/* Attempt History */}
                            <div className="space-y-3">
                                <h3 className="font-semibold text-lg">
                                    Lịch sử làm bài
                                </h3>
                                {history.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Bạn chưa có lần làm bài nào
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {history.map((attempt, index) => (
                                            <div
                                                key={attempt.sessionId}
                                                className={cn(
                                                    "rounded-lg border p-3",
                                                    attempt.isSubmitted
                                                        ? "bg-green-50 border-green-200"
                                                        : "bg-gray-50 border-gray-200"
                                                )}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {attempt.isSubmitted ? (
                                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-gray-400" />
                                                            )}
                                                            <span className="text-sm font-medium">
                                                                Lần {history.length - index}
                                                            </span>
                                                            {attempt.isSubmitted && (
                                                                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                                                                    Đã nộp
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatDate(
                                                                attempt.startTime
                                                            )}
                                                        </p>
                                                        {attempt.isSubmitted &&
                                                            attempt.score !== null && (
                                                                <p className="text-sm font-semibold text-green-700 mt-1">
                                                                    Điểm:{" "}
                                                                    {attempt.score.toFixed(
                                                                        1
                                                                    )}%
                                                                    {attempt.timeSpent &&
                                                                        ` • ${formatTime(
                                                                            attempt.timeSpent
                                                                        )}`}
                                                                </p>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={onClose}
                                    className="flex-1"
                                    disabled={isCreating}
                                >
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleStartExam}
                                    className="flex-1"
                                    disabled={
                                        isCreating ||
                                        !examInfo ||
                                        !examInfo.durationMinutes ||
                                        examInfo.durationMinutes <= 0
                                    }
                                >
                                    {isCreating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Đang tạo phiên...
                                        </>
                                    ) : (
                                        "Bắt đầu làm bài"
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

