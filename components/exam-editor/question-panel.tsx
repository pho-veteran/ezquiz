"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { Question } from "@/types"
import { ChevronLeft, TrashIcon } from "lucide-react"

interface QuestionPanelProps {
    question?: Question
    index: number
    total: number
    onUpdateQuestion: (id: string, updates: Partial<Question>) => void
    onDeleteQuestion: (id: string) => void
    onNavigatePrevious: () => void
    onNavigateNext: () => void
    stickyNavigation?: boolean
}

export function QuestionPanel({
    question,
    index,
    total,
    onUpdateQuestion,
    onDeleteQuestion,
    onNavigatePrevious,
    onNavigateNext,
    stickyNavigation = true,
}: QuestionPanelProps) {
    if (!question) {
        return (
            <Card className="h-[400px] flex items-center justify-center">
                <CardContent className="text-center text-muted-foreground">
                    <p>Chọn một câu hỏi để chỉnh sửa</p>
                </CardContent>
            </Card>
        )
    }

    const handleOptionChange = (optionIndex: number, value: string) => {
        const nextOptions = [...question.options]
        nextOptions[optionIndex] = value
        onUpdateQuestion(question.id, { options: nextOptions })
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Câu hỏi {index + 1}</CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => onDeleteQuestion(question.id)}
                        >
                            <TrashIcon className="mr-2 h-4 w-4" />
                            Xóa câu hỏi
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Nội dung câu hỏi</Label>
                        <Textarea
                            value={question.content}
                            onChange={(event) =>
                                onUpdateQuestion(question.id, { content: event.target.value })
                            }
                            placeholder="Nhập nội dung câu hỏi..."
                            className="min-h-[120px] text-base"
                        />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Các đáp án</Label>
                            <span className="text-sm text-muted-foreground">
                                Chọn đáp án đúng bằng radio button
                            </span>
                        </div>

                        <RadioGroup
                            value={question.correctIdx.toString()}
                            onValueChange={(value) =>
                                onUpdateQuestion(question.id, { correctIdx: parseInt(value, 10) })
                            }
                            className="space-y-3"
                        >
                            {question.options.map((option, optionIndex) => {
                                const isCorrect = question.correctIdx === optionIndex
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
                                            id={`opt-${question.id}-${optionIndex}`}
                                            className="mt-1 shrink-0"
                                        />
                                        <div className="flex-1 space-y-2">
                                            <Label
                                                htmlFor={`opt-${question.id}-${optionIndex}`}
                                                className="text-sm font-semibold text-muted-foreground cursor-pointer"
                                            >
                                                Đáp án {String.fromCharCode(65 + optionIndex)}
                                                {isCorrect && (
                                                    <span className="ml-2 text-green-600">
                                                        ✓ Đáp án đúng
                                                    </span>
                                                )}
                                            </Label>
                                            <Input
                                                value={option}
                                                onChange={(event) =>
                                                    handleOptionChange(optionIndex, event.target.value)
                                                }
                                                placeholder={`Nhập nội dung đáp án ${String.fromCharCode(
                                                    65 + optionIndex
                                                )}`}
                                                className="border-0 bg-white focus-visible:ring-1"
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Giải thích đáp án (Tùy chọn)</Label>
                        <p className="text-sm text-muted-foreground">
                            Giải thích sẽ hiển thị cho học sinh sau khi nộp bài
                        </p>
                        <Textarea
                            value={question.explanation || ""}
                            onChange={(event) =>
                                onUpdateQuestion(question.id, { explanation: event.target.value })
                            }
                            placeholder="Nhập giải thích cho đáp án đúng..."
                            className="min-h-[100px]"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className={cn(stickyNavigation ? "sticky bottom-4 shadow-lg" : "shadow-sm")}>
                <div className="p-2 px-4">
                    <div className="flex justify-between items-center">
                        <Button
                            variant="outline"
                            onClick={onNavigatePrevious}
                            disabled={index === 0}
                        >
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Câu trước
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Câu {index + 1} / {total}
                        </span>
                        <Button
                            variant="outline"
                            onClick={onNavigateNext}
                            disabled={index === total - 1}
                        >
                            Câu sau
                            <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    )
}

