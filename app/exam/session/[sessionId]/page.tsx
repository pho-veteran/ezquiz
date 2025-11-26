"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    ClockIcon,
    CheckCircleIcon,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Save,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

interface Question {
    id: string
    content: string
    options: string[]
}

interface SessionData {
    sessionId: string
    startTime: string
    endTime: string
    answers: Record<string, number> | null
    isSubmitted: boolean
    exam: {
        id: string
        code: string
        title: string
        durationMinutes: number | null
        questions: Question[]
    }
}

export default function ExamSessionPage() {
    const params = useParams<{ sessionId: string }>()
    const router = useRouter()
    const sessionId = params.sessionId

    const [sessionData, setSessionData] = useState<SessionData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [timeLeft, setTimeLeft] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null)
    const [isAutoSaving, setIsAutoSaving] = useState(false)

    const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

    const QUESTIONS_PER_PAGE = 60

    const fetchSession = useCallback(async () => {
        try {
            setIsLoading(true)
            const response = await apiClient.get(`/sessions/${sessionId}`)

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error || "Failed to load session")
            }

            const data = response.data.data

            // Check if already submitted
            if (data.isSubmitted) {
                router.push(
                    `/exam/${data.exam.code}/result?sessionId=${sessionId}`
                )
                return
            }

            // Check if expired
            const now = new Date()
            const endTime = new Date(data.endTime)
            if (now > endTime) {
                // Session expired - auto-submit with saved answers
                try {
                    const submitResponse = await apiClient.post(
                        `/sessions/${sessionId}/submit`,
                        { answers: (data.answers as Record<string, number>) ?? {} }
                    )
                    
                    if (submitResponse.data.success) {
                        const { submissionId } = submitResponse.data.data
                        toast.info("Thời gian làm bài đã hết. Bài thi đã được tự động nộp.")
                        router.push(
                            `/exam/${data.exam.code}/result?sessionId=${sessionId}&submissionId=${submissionId}`
                        )
                    } else {
                        throw new Error(submitResponse.data.error || "Failed to auto-submit")
                    }
                } catch (submitErr) {
                    console.error("Error auto-submitting expired session:", submitErr)
                    toast.error("Phiên làm bài đã hết hạn nhưng không thể tự động nộp. Vui lòng thử lại.")
                    router.push(`/exam/${data.exam.code}/result?sessionId=${sessionId}`)
                }
                return
            }

            setSessionData(data)
            setAnswers((data.answers as Record<string, number>) ?? {})

            // Calculate initial time left
            const timeRemainingMs = endTime.getTime() - now.getTime()
            setTimeLeft(Math.max(0, Math.floor(timeRemainingMs / 1000)))
        } catch (err) {
            console.error("Error fetching session:", err)
            toast.error(
                err instanceof Error
                    ? err.message
                    : "Không thể tải phiên làm bài"
            )
        } finally {
            setIsLoading(false)
        }
    }, [sessionId, router])

    useEffect(() => {
        fetchSession()
    }, [fetchSession])

    // Heartbeat to sync time with server
    useEffect(() => {
        if (!sessionData || sessionData.isSubmitted) return

        const heartbeat = async () => {
            try {
                const response = await apiClient.get(
                    `/sessions/${sessionId}/heartbeat`
                )

                if (response.data.success && response.data.data) {
                    const { timeRemainingSeconds, isExpired, isSubmitted } =
                        response.data.data

                    if (isSubmitted || isExpired) {
                        await handleSubmit(true)
                        return
                    }

                    setTimeLeft(timeRemainingSeconds)
                }
            } catch (err) {
                console.error("Heartbeat error:", err)
            }
        }

        // Initial heartbeat
        heartbeat()

        // Set up interval (every 60 seconds)
        heartbeatIntervalRef.current = setInterval(heartbeat, 60000)

        return () => {
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionData, sessionId])

    // Auto-save answers
    useEffect(() => {
        if (!sessionData || sessionData.isSubmitted) return

        const autoSave = async () => {
            if (Object.keys(answers).length === 0) return

            try {
                setIsAutoSaving(true)
                const response = await apiClient.patch(`/sessions/${sessionId}`, {
                    answers,
                })

                if (response.data.success) {
                    setLastAutoSave(new Date())
                }
            } catch (err) {
                console.error("Auto-save error:", err)
            } finally {
                setIsAutoSaving(false)
            }
        }

        // Initial auto-save after 60 seconds
        autoSaveIntervalRef.current = setInterval(autoSave, 60000)

        return () => {
            if (autoSaveIntervalRef.current) {
                clearInterval(autoSaveIntervalRef.current)
            }
        }
    }, [sessionData, sessionId, answers])

    // Client-side timer (updates every second, synced by heartbeat)
    useEffect(() => {
        if (!sessionData || sessionData.isSubmitted) return

        timerIntervalRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    handleSubmit(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current)
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionData])

    const handleAnswer = (questionId: string, optionIndex: number) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: optionIndex,
        }))
    }

    const handleSubmit = useCallback(
        async (isAutoSubmit = false) => {
            if (isSubmitting) return

            try {
                setIsSubmitting(true)

                // Clear intervals
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current)
                }
                if (autoSaveIntervalRef.current) {
                    clearInterval(autoSaveIntervalRef.current)
                }
                if (timerIntervalRef.current) {
                    clearInterval(timerIntervalRef.current)
                }

                const response = await apiClient.post(
                    `/sessions/${sessionId}/submit`,
                    { answers }
                )

                if (!response.data.success) {
                    throw new Error(response.data.error || "Failed to submit")
                }

                const { submissionId } = response.data.data

                if (isAutoSubmit) {
                    toast.info("Thời gian làm bài đã hết. Bài thi đã được tự động nộp.")
                } else {
                    toast.success("Đã nộp bài thành công!")
                }

                router.push(
                    `/exam/${sessionData?.exam.code}/result?sessionId=${sessionId}&submissionId=${submissionId}`
                )
            } catch (err) {
                console.error("Error submitting:", err)
                toast.error(
                    err instanceof Error
                        ? err.message
                        : "Không thể nộp bài"
                )
            } finally {
                setIsSubmitting(false)
            }
        },
        [sessionId, answers, router, sessionData, isSubmitting]
    )

    const formatTime = (seconds: number) => {
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

    if (isLoading || !sessionData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Đang tải đề thi...</p>
                </div>
            </div>
        )
    }

    const totalPages = Math.ceil(
        sessionData.exam.questions.length / QUESTIONS_PER_PAGE
    )
    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE
    const endIndex = startIndex + QUESTIONS_PER_PAGE
    const currentQuestions = sessionData.exam.questions.slice(
        startIndex,
        endIndex
    )
    const answeredCount = Object.keys(answers).length
    const progressPercentage =
        (answeredCount / sessionData.exam.questions.length) * 100

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto p-4">
                {/* Header */}
                <Card className="mb-4">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xl">
                                {sessionData.exam.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {isAutoSaving && (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Đang lưu...</span>
                                    </>
                                )}
                                {lastAutoSave && !isAutoSaving && (
                                    <>
                                        <Save className="h-4 w-4 text-green-600" />
                                        <span>
                                            Đã lưu lúc{" "}
                                            {lastAutoSave.toLocaleTimeString(
                                                "vi-VN"
                                            )}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Left Column: Questions */}
                    <div className="lg:col-span-2 space-y-4">
                        {currentQuestions.map((question, index) => {
                            const globalIndex = startIndex + index
                            const questionNumber = globalIndex + 1
                            const isAnswered = answers[question.id] !== undefined

                            return (
                                <Card
                                    key={question.id}
                                    className={cn(
                                        "transition-all",
                                        isAnswered && "border-primary"
                                    )}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={cn(
                                                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                                                    isAnswered
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-gray-200 text-gray-600"
                                                )}
                                            >
                                                {questionNumber}
                                            </div>
                                            <CardTitle className="text-base font-medium flex-1">
                                                {question.content}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {question.options.map(
                                                (option, optionIndex) => {
                                                    const isSelected =
                                                        answers[question.id] ===
                                                        optionIndex

                                                    return (
                                                        <button
                                                            key={optionIndex}
                                                            onClick={() =>
                                                                handleAnswer(
                                                                    question.id,
                                                                    optionIndex
                                                                )
                                                            }
                                                            className={cn(
                                                                "w-full text-left flex items-center space-x-3 border rounded-lg p-3 transition-all",
                                                                "hover:bg-gray-50 hover:border-primary/50",
                                                                isSelected &&
                                                                    "border-primary bg-primary/5 ring-2 ring-primary/20"
                                                            )}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                    isSelected
                                                                        ? "border-primary bg-primary"
                                                                        : "border-gray-300"
                                                                )}
                                                            >
                                                                {isSelected && (
                                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                                )}
                                                            </div>
                                                            <Label className="flex-1 cursor-pointer font-normal">
                                                                {option}
                                                            </Label>
                                                        </button>
                                                    )
                                                }
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 py-4">
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setCurrentPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Trang trước
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from(
                                        { length: totalPages },
                                        (_, i) => i + 1
                                    ).map((page) => (
                                        <Button
                                            key={page}
                                            variant={
                                                currentPage === page
                                                    ? "default"
                                                    : "outline"
                                            }
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setCurrentPage((p) =>
                                            Math.min(totalPages, p + 1)
                                        )
                                    }
                                    disabled={currentPage === totalPages}
                                >
                                    Trang sau
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Navigation Panel */}
                    <div className="lg:col-span-1">
                        <Card className="sticky top-4">
                            <CardHeader>
                                <CardTitle className="text-base">
                                    Danh sách câu hỏi
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Timer */}
                                <div
                                    className={cn(
                                        "flex items-center justify-center gap-2 font-mono font-bold px-4 py-3 rounded-lg text-lg",
                                        timeLeft < 300
                                            ? "bg-red-100 text-red-700"
                                            : "bg-orange-50 text-orange-600"
                                    )}
                                >
                                    <ClockIcon className="h-5 w-5" />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>

                                <Separator />

                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Đã làm
                                        </span>
                                        <span className="font-semibold">
                                            {answeredCount}/
                                            {sessionData.exam.questions.length}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{
                                                width: `${progressPercentage}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Question Grid */}
                                <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto">
                                    {sessionData.exam.questions.map(
                                        (q, index) => {
                                            const isAnswered =
                                                answers[q.id] !== undefined
                                            const questionPage =
                                                Math.floor(
                                                    index / QUESTIONS_PER_PAGE
                                                ) + 1

                                            return (
                                                <button
                                                    key={q.id}
                                                    onClick={() => {
                                                        setCurrentPage(
                                                            questionPage
                                                        )
                                                    }}
                                                    className={cn(
                                                        "aspect-square rounded-md flex items-center justify-center text-sm font-medium transition-all",
                                                        isAnswered
                                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                                    )}
                                                >
                                                    {index + 1}
                                                </button>
                                            )
                                        }
                                    )}
                                </div>

                                <Separator />

                                {/* Submit Button */}
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    size="lg"
                                    disabled={isSubmitting || timeLeft <= 0}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Đang nộp...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="mr-2 h-5 w-5" />
                                            Nộp bài ({answeredCount}/
                                            {sessionData.exam.questions.length})
                                        </>
                                    )}
                                </Button>

                                {/* Legend */}
                                <div className="text-xs space-y-1 text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-primary rounded" />
                                        <span>Đã trả lời</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-gray-100 rounded border" />
                                        <span>Chưa trả lời</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

