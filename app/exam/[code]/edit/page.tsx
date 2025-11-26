"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Question } from "@/types"
import { Save, ChevronLeft, PlusIcon, TrashIcon, CheckCircle2, GripVertical } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// Mock exam data
const MOCK_EXAM_QUESTIONS: Question[] = Array.from({ length: 15 }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Câu hỏi số ${i + 1}: Đây là nội dung câu hỏi mẫu?`,
    options: ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    correctAnswer: Math.floor(Math.random() * 4),
}))

export default function EditExamPage() {
    const router = useRouter()
    const params = useParams()
    const [examTitle, setExamTitle] = useState("Kiểm tra kiến thức chung")
    const [questions, setQuestions] = useState<Question[]>(MOCK_EXAM_QUESTIONS)
    const [selectedQuestionId, setSelectedQuestionId] = useState<string>(questions[0]?.id || "")
    const [leftWidth, setLeftWidth] = useState(25) // percentage
    const [isResizing, setIsResizing] = useState(false)

    const selectedQuestion = questions.find(q => q.id === selectedQuestionId)
    const selectedIndex = questions.findIndex(q => q.id === selectedQuestionId)

    const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
    }

    const handleDeleteQuestion = (id: string) => {
        if (questions.length <= 1) {
            alert("Đề thi phải có ít nhất 1 câu hỏi!")
            return
        }
        const index = questions.findIndex(q => q.id === id)
        setQuestions(questions.filter(q => q.id !== id))

        const newQuestions = questions.filter(q => q.id !== id)
        if (newQuestions.length > 0) {
            const newIndex = Math.min(index, newQuestions.length - 1)
            setSelectedQuestionId(newQuestions[newIndex].id)
        }
    }

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: `new_${Date.now()}`,
            text: "",
            options: ["", "", "", ""],
            correctAnswer: 0
        }
        setQuestions([...questions, newQuestion])
        setSelectedQuestionId(newQuestion.id)
    }

    const handleSave = () => {
        alert("Đã lưu thay đổi!")
        router.push("/dashboard")
    }

    const handleUpdateOption = (optionIndex: number, value: string) => {
        if (selectedQuestion) {
            const newOptions = [...selectedQuestion.options]
            newOptions[optionIndex] = value
            handleUpdateQuestion(selectedQuestion.id, { options: newOptions })
        }
    }

    const isQuestionComplete = (q: Question) => {
        return q.text.trim() !== "" && q.options.every(opt => opt.trim() !== "")
    }

    const handleMouseDown = () => {
        setIsResizing(true)
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isResizing) return
        const container = e.currentTarget as HTMLElement
        const containerRect = container.getBoundingClientRect()
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
        if (newWidth >= 20 && newWidth <= 40) {
            setLeftWidth(newWidth)
        }
    }

    const handleMouseUp = () => {
        setIsResizing(false)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b bg-white sticky top-0 z-20">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                            <Input
                                value={examTitle}
                                onChange={(e) => setExamTitle(e.target.value)}
                                className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                                placeholder="Nhập tên đề thi..."
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Mã đề: <span className="font-mono font-semibold">{params.code}</span> • {questions.length} câu hỏi
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => router.push("/dashboard")}>
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Hủy
                            </Button>
                            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                                <Save className="mr-2 h-4 w-4" />
                                Lưu đề thi
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div
                className="container mx-auto p-4 flex gap-4 relative"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {/* Left Column: Question List */}
                <div style={{ width: `${leftWidth}%` }} className="shrink-0">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <CardTitle className="text-base">Danh sách câu hỏi</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-2">
                                {questions.map((q, index) => {
                                    const isSelected = selectedQuestionId === q.id
                                    const isComplete = isQuestionComplete(q)

                                    return (
                                        <div
                                            key={q.id}
                                            className={cn(
                                                "group relative p-3 rounded-lg border-2 transition-all",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm"
                                                    : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                                            )}
                                        >
                                            <button
                                                onClick={() => setSelectedQuestionId(q.id)}
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-start gap-2">
                                                    <div className={cn(
                                                        "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                                                        isSelected
                                                            ? "bg-primary text-primary-foreground"
                                                            : "bg-gray-200 text-gray-600"
                                                    )}>
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-6">
                                                        <p className="text-sm font-medium truncate">
                                                            {q.text || "Chưa có nội dung"}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {isComplete && (
                                                                <span className="text-xs text-green-600 flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Hoàn thành
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteQuestion(q.id)
                                                }}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>

                            <Separator />

                            <Button
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={handleAddQuestion}
                            >
                                <PlusIcon className="mr-2 h-4 w-4" />
                                Thêm câu hỏi
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Resizer */}
                <div
                    className={cn(
                        "w-1 cursor-col-resize hover:bg-primary/50 transition-colors shrink-0 relative group",
                        isResizing && "bg-primary"
                    )}
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
                        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </div>

                {/* Right Column: Question Editor */}
                <div className="flex-1 min-w-0">
                    {selectedQuestion ? (
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">
                                            Câu hỏi {selectedIndex + 1}
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                                        >
                                            <TrashIcon className="mr-2 h-4 w-4" />
                                            Xóa câu hỏi
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Question Text */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Nội dung câu hỏi</Label>
                                        <Textarea
                                            value={selectedQuestion.text}
                                            onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { text: e.target.value })}
                                            placeholder="Nhập nội dung câu hỏi..."
                                            className="min-h-[120px] text-base"
                                        />
                                    </div>

                                    <Separator />

                                    {/* Options */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-base font-semibold">Các đáp án</Label>
                                            <span className="text-sm text-muted-foreground">
                                                Chọn đáp án đúng bằng radio button
                                            </span>
                                        </div>

                                        <RadioGroup
                                            value={selectedQuestion.correctAnswer.toString()}
                                            onValueChange={(value) => handleUpdateQuestion(selectedQuestion.id, { correctAnswer: parseInt(value) })}
                                            className="space-y-3"
                                        >
                                            {selectedQuestion.options.map((option, optionIndex) => {
                                                const isCorrect = selectedQuestion.correctAnswer === optionIndex

                                                return (
                                                    <div
                                                        key={optionIndex}
                                                        className={cn(
                                                            "flex items-start gap-3 p-4 rounded-lg border-2 transition-all",
                                                            isCorrect
                                                                ? "border-green-500 bg-green-50"
                                                                : "border-gray-200 hover:border-gray-300"
                                                        )}
                                                    >
                                                        <RadioGroupItem
                                                            value={optionIndex.toString()}
                                                            id={`opt-${optionIndex}`}
                                                            className="mt-1 shrink-0"
                                                        />
                                                        <div className="flex-1 space-y-2">
                                                            <Label
                                                                htmlFor={`opt-${optionIndex}`}
                                                                className="text-sm font-semibold text-muted-foreground cursor-pointer"
                                                            >
                                                                Đáp án {String.fromCharCode(65 + optionIndex)}
                                                                {isCorrect && (
                                                                    <span className="ml-2 text-green-600">✓ Đáp án đúng</span>
                                                                )}
                                                            </Label>
                                                            <Input
                                                                value={option}
                                                                onChange={(e) => handleUpdateOption(optionIndex, e.target.value)}
                                                                placeholder={`Nhập nội dung đáp án ${String.fromCharCode(65 + optionIndex)}`}
                                                                className="border-0 bg-white focus-visible:ring-1"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </RadioGroup>
                                    </div>

                                    <Separator />

                                    {/* Explanation */}
                                    <div className="space-y-2">
                                        <Label className="text-base font-semibold">Giải thích đáp án (Tùy chọn)</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Giải thích sẽ hiển thị cho học sinh sau khi nộp bài
                                        </p>
                                        <Textarea
                                            value={selectedQuestion.explanation || ""}
                                            onChange={(e) => handleUpdateQuestion(selectedQuestion.id, { explanation: e.target.value })}
                                            placeholder="Nhập giải thích cho đáp án đúng..."
                                            className="min-h-[100px]"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Navigation - Sticky */}
                            <Card className="sticky bottom-4 shadow-lg">
                                <CardContent className="py-2 px-4">
                                    <div className="flex justify-between items-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                const prevIndex = Math.max(0, selectedIndex - 1)
                                                setSelectedQuestionId(questions[prevIndex].id)
                                            }}
                                            disabled={selectedIndex === 0}
                                        >
                                            <ChevronLeft className="mr-2 h-4 w-4" />
                                            Câu trước
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Câu {selectedIndex + 1} / {questions.length}
                                        </span>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                const nextIndex = Math.min(questions.length - 1, selectedIndex + 1)
                                                setSelectedQuestionId(questions[nextIndex].id)
                                            }}
                                            disabled={selectedIndex === questions.length - 1}
                                        >
                                            Câu sau
                                            <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : (
                        <Card className="h-[400px] flex items-center justify-center">
                            <CardContent className="text-center text-muted-foreground">
                                <p>Chọn một câu hỏi để chỉnh sửa</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
