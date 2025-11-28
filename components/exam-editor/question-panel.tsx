"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { TipTapEditor } from "@/components/tiptap-editor"
import { cn } from "@/lib/utils"
import type { Question } from "@/types"
import { ChevronLeft, TrashIcon, ChevronDown, ChevronUp } from "lucide-react"

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
    const [isExplanationExpanded, setIsExplanationExpanded] = useState(false)
    const [expandedOptionIndex, setExpandedOptionIndex] = useState<number | null>(null)

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
                        <p className="text-sm text-muted-foreground">
                            Hỗ trợ Markdown (ví dụ: **đậm**, *nghiêng*, danh sách `-`) và LaTeX
                            (ví dụ: $$\\int_0^1 x^2 dx$$).
                        </p>
                        <TipTapEditor
                            value={question.content}
                            onChange={(value) =>
                                onUpdateQuestion(question.id, { content: value })
                            }
                            placeholder="Nhập nội dung câu hỏi..."
                            minHeight="120px"
                            editable
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
                                const isExpanded = expandedOptionIndex === optionIndex
                                
                                return (
                                    <div
                                        key={optionIndex}
                                        className={cn(
                                            "rounded-lg border-2 transition-all",
                                            isCorrect
                                                ? "border-green-500 bg-green-50"
                                                : "border-gray-200 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-start gap-3 p-4">
                                            <RadioGroupItem
                                                value={optionIndex.toString()}
                                                id={`opt-${question.id}-${optionIndex}`}
                                                className="mt-1 shrink-0"
                                            />
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center justify-between">
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
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setExpandedOptionIndex(
                                                                isExpanded ? null : optionIndex
                                                            )
                                                        }}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <div
                                                    className={cn(
                                                        "rounded-md transition-colors",
                                                        isExpanded
                                                            ? "border bg-background"
                                                            : "border border-transparent bg-background hover:bg-muted/20 cursor-pointer",
                                                    )}
                                                    onClick={() => {
                                                        if (!isExpanded) {
                                                            setExpandedOptionIndex(optionIndex)
                                                        }
                                                    }}
                                                >
                                                    {isExpanded && (
                                                        <p className="px-4 pt-3 text-xs text-muted-foreground">
                                                            Bạn có thể sử dụng Markdown và LaTeX.
                                                        </p>
                                                    )}
                                                    <TipTapEditor
                                                        value={option}
                                                        onChange={(value) =>
                                                            handleOptionChange(optionIndex, value)
                                                        }
                                                        placeholder={`Nhập nội dung đáp án ${String.fromCharCode(
                                                            65 + optionIndex
                                                        )}`}
                                                        minHeight="80px"
                                                        editable={isExpanded}
                                                        showBorder={false}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-base font-semibold">Giải thích đáp án (Tùy chọn)</Label>
                                <p className="text-sm text-muted-foreground">
                                    Giải thích sẽ hiển thị cho học sinh sau khi nộp bài
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExplanationExpanded(!isExplanationExpanded)}
                                className="h-8"
                            >
                                {isExplanationExpanded ? (
                                    <>
                                        <ChevronUp className="mr-2 h-4 w-4" />
                                        Thu gọn
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="mr-2 h-4 w-4" />
                                        Mở rộng
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="border rounded-md bg-background min-h-[100px]">
                            {isExplanationExpanded && (
                                <p className="px-4 pt-3 text-xs text-muted-foreground">
                                    Bạn có thể sử dụng Markdown và LaTeX cho phần giải thích.
                                </p>
                            )}
                            <TipTapEditor
                                value={question.explanation || ""}
                                onChange={(value) =>
                                    onUpdateQuestion(question.id, { explanation: value })
                                }
                                placeholder="Nhập giải thích cho đáp án đúng..."
                                minHeight="100px"
                                editable={isExplanationExpanded}
                                showBorder={false}
                            />
                        </div>
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

