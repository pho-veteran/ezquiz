import { Question } from "@/types"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { TrashIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TipTapEditor } from "@/components/tiptap-editor"

interface QuestionEditorProps {
    question: Question
    index: number
    onUpdate: (id: string, updates: Partial<Question>) => void
    onDelete: (id: string) => void
}

export function QuestionEditor({
    question,
    index,
    onUpdate,
    onDelete,
}: QuestionEditorProps) {
    return (
        <Card className="relative">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">
                        Câu hỏi {index + 1}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive/90"
                        onClick={() => onDelete(question.id)}
                    >
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Nội dung câu hỏi</Label>
                    <p className="text-sm text-muted-foreground">
                        Hỗ trợ Markdown (ví dụ: **đậm**, *nghiêng*) và LaTeX (ví dụ: $$\\int_0^1 x^2 dx$$).
                    </p>
                    <TipTapEditor
                        value={question.content}
                        onChange={(value) => onUpdate(question.id, { content: value })}
                        placeholder="Nhập nội dung câu hỏi..."
                        minHeight="120px"
                        editable
                    />
                </div>
                <div className="space-y-3">
                    <Label>Các đáp án</Label>
                    {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                            <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctIdx === optionIndex}
                                onChange={() =>
                                    onUpdate(question.id, { correctIdx: optionIndex })
                                }
                                className="h-4 w-4"
                            />
                            <div className="flex-1">
                                <p className="text-xs text-muted-foreground mb-1">
                                    Hỗ trợ Markdown và LaTeX.
                                </p>
                                <TipTapEditor
                                    value={option}
                                    onChange={(value) => {
                                        const newOptions = [...question.options]
                                        newOptions[optionIndex] = value
                                        onUpdate(question.id, { options: newOptions })
                                    }}
                                    placeholder={`Đáp án ${optionIndex + 1}`}
                                    minHeight="60px"
                                    editable
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
