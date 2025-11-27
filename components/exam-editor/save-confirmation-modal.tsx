"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Question } from "@/types"
import { AlertCircle } from "lucide-react"

interface SaveConfirmationModalProps {
    incompleteQuestions: Array<{ question: Question; index: number }>
    onConfirm: () => void
    onCancel: () => void
}

export function SaveConfirmationModal({
    incompleteQuestions,
    onConfirm,
    onCancel,
}: SaveConfirmationModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        Cảnh báo: Có câu hỏi chưa hoàn thành
                    </CardTitle>
                    <CardDescription>
                        Các câu hỏi sau đây không đáp ứng yêu cầu (cần có nội dung và ít nhất 2 đáp án).
                        Những câu hỏi này sẽ bị loại bỏ khi lưu.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {incompleteQuestions.map(({ question, index }) => {
                            const filledOptions = question.options.filter(
                                (opt) => opt.trim().length > 0
                            ).length
                            const hasContent = question.content.trim().length > 0

                            return (
                                <div
                                    key={question.id}
                                    className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                                >
                                    <div className="flex items-start gap-2">
                                        <span className="font-semibold text-sm text-yellow-900">
                                            Câu {index + 1}:
                                        </span>
                                        <div className="flex-1 space-y-1">
                                            {!hasContent && (
                                                <p className="text-xs text-yellow-800">
                                                    • Thiếu nội dung câu hỏi
                                                </p>
                                            )}
                                            {filledOptions < 2 && (
                                                <p className="text-xs text-yellow-800">
                                                    • Chỉ có {filledOptions} đáp án (cần ít nhất 2)
                                                </p>
                                            )}
                                            {hasContent && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {question.content}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onCancel} className="flex-1">
                            Hủy
                        </Button>
                        <Button onClick={onConfirm} className="flex-1">
                            Xác nhận và lưu
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

