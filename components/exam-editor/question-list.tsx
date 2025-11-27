"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { isQuestionValidForSave } from "@/lib/question-validation"
import type { Question } from "@/types"
import { CheckCircle2, PlusIcon, TrashIcon } from "lucide-react"

interface QuestionListProps {
    questions: Question[]
    selectedQuestionId?: string
    onSelect: (questionId: string) => void
    onAddQuestion: () => void
    onDeleteQuestion: (questionId: string) => void
    sticky?: boolean
}

export function QuestionList({
    questions,
    selectedQuestionId,
    onSelect,
    onAddQuestion,
    onDeleteQuestion,
    sticky = true,
}: QuestionListProps) {
    const cardClass = cn(sticky ? "sticky top-24" : "", "h-full")

    return (
        <Card className={cardClass}>
            <CardHeader>
                <CardTitle className="text-base">Danh sách câu hỏi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-2">
                    {questions.map((question, index) => {
                        const isSelected = selectedQuestionId === question.id
                        const complete = isQuestionValidForSave(question)

                        return (
                            <div
                                key={question.id}
                                className={cn(
                                    "group relative p-3 rounded-lg border-2 transition-all",
                                    isSelected
                                        ? "border-primary bg-primary/5 shadow-sm"
                                        : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                                )}
                            >
                                <button
                                    onClick={() => onSelect(question.id)}
                                    className="w-full text-left"
                                    type="button"
                                >
                                    <div className="flex items-start gap-2">
                                        <div
                                            className={cn(
                                                "shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-gray-200 text-gray-600"
                                            )}
                                        >
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className="text-sm font-medium truncate">
                                                {question.content || "Chưa có nội dung"}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                {complete && (
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
                                    onClick={(event) => {
                                        event.stopPropagation()
                                        onDeleteQuestion(question.id)
                                    }}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                </div>

                <Separator />

                <Button variant="outline" className="w-full border-dashed" onClick={onAddQuestion}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Thêm câu hỏi
                </Button>
            </CardContent>
        </Card>
    )
}

