import { Question } from "@/types"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { TrashIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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
                    <Textarea
                        value={question.text}
                        onChange={(e) => onUpdate(question.id, { text: e.target.value })}
                        placeholder="Nhập nội dung câu hỏi..."
                    />
                </div>
                <div className="space-y-3">
                    <Label>Các đáp án</Label>
                    {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                            <input
                                type="radio"
                                name={`correct-${question.id}`}
                                checked={question.correctAnswer === optionIndex}
                                onChange={() =>
                                    onUpdate(question.id, { correctAnswer: optionIndex })
                                }
                                className="h-4 w-4"
                            />
                            <Input
                                value={option}
                                onChange={(e) => {
                                    const newOptions = [...question.options]
                                    newOptions[optionIndex] = e.target.value
                                    onUpdate(question.id, { options: newOptions })
                                }}
                                placeholder={`Đáp án ${optionIndex + 1}`}
                            />
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
