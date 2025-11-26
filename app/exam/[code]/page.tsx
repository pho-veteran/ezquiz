"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ClockIcon, CheckCircleIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock exam data - generate 75 questions for testing pagination
const MOCK_EXAM_DATA = {
    title: "Kiểm tra kiến thức chung",
    questions: Array.from({ length: 75 }, (_, i) => ({
        id: `q${i + 1}`,
        content: `Câu ${i + 1}: Đây là nội dung câu hỏi số ${i + 1}?`,
        options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    }))
}

const QUESTIONS_PER_PAGE = 60

export default function ExamPage() {
    const params = useParams()
    const router = useRouter()
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [timeLeft, setTimeLeft] = useState(45 * 60) // 45 minutes
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = Math.ceil(MOCK_EXAM_DATA.questions.length / QUESTIONS_PER_PAGE)
    const startIndex = (currentPage - 1) * QUESTIONS_PER_PAGE
    const endIndex = startIndex + QUESTIONS_PER_PAGE
    const currentQuestions = MOCK_EXAM_DATA.questions.slice(startIndex, endIndex)

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const handleAnswer = (questionId: string, optionIndex: number) => {
        setAnswers({
            ...answers,
            [questionId]: optionIndex
        })
    }

    const handleSubmit = useCallback(() => {
        const score = Object.keys(answers).length
        router.push(`/exam/${params.code}/result?score=${score}&total=${MOCK_EXAM_DATA.questions.length}`)
    }, [answers, params.code, router])

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer)
                    handleSubmit()
                    return 0
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timer)
    }, [handleSubmit])

    const answeredCount = Object.keys(answers).length
    const progressPercentage = (answeredCount / MOCK_EXAM_DATA.questions.length) * 100

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="container mx-auto p-4">
                {/* Header */}
                <Card className="mb-4">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl">{MOCK_EXAM_DATA.title}</CardTitle>
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
                                <Card key={question.id} className={cn(
                                    "transition-all",
                                    isAnswered && "border-primary"
                                )}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold",
                                                isAnswered ? "bg-primary text-primary-foreground" : "bg-gray-200 text-gray-600"
                                            )}>
                                                {questionNumber}
                                            </div>
                                            <CardTitle className="text-base font-medium flex-1">
                                                {question.content}
                                            </CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {question.options.map((option, optionIndex) => {
                                                const isSelected = answers[question.id] === optionIndex

                                                return (
                                                    <button
                                                        key={optionIndex}
                                                        onClick={() => handleAnswer(question.id, optionIndex)}
                                                        className={cn(
                                                            "w-full text-left flex items-center space-x-3 border rounded-lg p-3 transition-all",
                                                            "hover:bg-gray-50 hover:border-primary/50",
                                                            isSelected && "border-primary bg-primary/5 ring-2 ring-primary/20"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                            isSelected ? "border-primary bg-primary" : "border-gray-300"
                                                        )}>
                                                            {isSelected && (
                                                                <div className="w-2 h-2 bg-white rounded-full" />
                                                            )}
                                                        </div>
                                                        <Label className="flex-1 cursor-pointer font-normal">
                                                            {option}
                                                        </Label>
                                                    </button>
                                                )
                                            })}
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
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="mr-2 h-4 w-4" />
                                    Trang trước
                                </Button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
                                <CardTitle className="text-base">Danh sách câu hỏi</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Timer */}
                                <div className={cn(
                                    "flex items-center justify-center gap-2 font-mono font-bold px-4 py-3 rounded-lg text-lg",
                                    timeLeft < 300 ? "bg-red-100 text-red-700" : "bg-orange-50 text-orange-600"
                                )}>
                                    <ClockIcon className="h-5 w-5" />
                                    <span>{formatTime(timeLeft)}</span>
                                </div>

                                <Separator />

                                {/* Progress */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Đã làm</span>
                                        <span className="font-semibold">{answeredCount}/{MOCK_EXAM_DATA.questions.length}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${progressPercentage}%` }}
                                        />
                                    </div>
                                </div>

                                <Separator />

                                {/* Question Grid */}
                                <div className="grid grid-cols-5 gap-2 max-h-[400px] overflow-y-auto">
                                    {MOCK_EXAM_DATA.questions.map((q, index) => {
                                        const isAnswered = answers[q.id] !== undefined
                                        const questionPage = Math.floor(index / QUESTIONS_PER_PAGE) + 1

                                        return (
                                            <button
                                                key={q.id}
                                                onClick={() => {
                                                    setCurrentPage(questionPage)
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
                                    })}
                                </div>

                                <Separator />

                                {/* Submit Button */}
                                <Button
                                    onClick={handleSubmit}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    size="lg"
                                >
                                    <CheckCircleIcon className="mr-2 h-5 w-5" />
                                    Nộp bài ({answeredCount}/{MOCK_EXAM_DATA.questions.length})
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
