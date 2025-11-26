"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { ExamEditorHeader } from "@/components/exam-editor/exam-editor-header"
import { QuestionList } from "@/components/exam-editor/question-list"
import { QuestionPanel } from "@/components/exam-editor/question-panel"
import type { Question } from "@/types"
import type { Exam } from "@/types"
import { GripVertical } from "lucide-react"

type ExamEditorVariant = "page" | "embedded"

export interface ExamEditorSavePayload {
    title: string
    status: Exam["status"]
    code: string
    questions: Question[]
    durationMinutes?: number | null
}

interface ExamEditorProps {
    exam: Exam
    onSave: (payload: ExamEditorSavePayload) => Promise<Exam>
    onBack?: () => void
    primaryActionLabel?: string
    showHeader?: boolean
    variant?: ExamEditorVariant
}

const DEFAULT_OPTIONS = ["", "", "", ""]

function createEmptyQuestion(): Question {
    return {
        id: `temp-${Date.now()}`,
        content: "",
        options: [...DEFAULT_OPTIONS],
        correctIdx: 0,
    }
}

function normalizeExam(exam: Exam): Exam {
    const normalizedQuestions =
        exam.questions.length > 0
            ? exam.questions.map((question) => ({
                  ...question,
                  options: question.options.length > 0 ? question.options : DEFAULT_OPTIONS,
              }))
            : [createEmptyQuestion()]

    return {
        ...exam,
        questions: normalizedQuestions,
    }
}

export function ExamEditor({
    exam,
    onSave,
    onBack,
    primaryActionLabel = "Lưu đề thi",
    showHeader = true,
    variant = "page",
}: ExamEditorProps) {
    const [draftExam, setDraftExam] = useState<Exam>(() => normalizeExam(exam))
    const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
        () => draftExam.questions[0]?.id || ""
    )
    const [leftWidth, setLeftWidth] = useState(25)
    const [isResizing, setIsResizing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        const normalizedExam = normalizeExam(exam)
        setDraftExam(normalizedExam)
        setSelectedQuestionId((currentId) => {
            if (normalizedExam.questions.some((question) => question.id === currentId)) {
                return currentId
            }
            return normalizedExam.questions[0]?.id || ""
        })
    }, [exam])

    const selectedQuestion = useMemo(
        () => draftExam.questions.find((question) => question.id === selectedQuestionId),
        [draftExam.questions, selectedQuestionId]
    )

    const selectedIndex = selectedQuestion
        ? draftExam.questions.findIndex((question) => question.id === selectedQuestion.id)
        : -1

    const handleQuestionUpdate = (questionId: string, updates: Partial<Question>) => {
        setDraftExam((current) => ({
            ...current,
            questions: current.questions.map((question) =>
                question.id === questionId ? { ...question, ...updates } : question
            ),
        }))
    }

    const handleDeleteQuestion = (questionId: string) => {
        let nextSelectedId = selectedQuestionId

        setDraftExam((current) => {
            if (current.questions.length <= 1) {
                toast.error("Đề thi phải có ít nhất 1 câu hỏi.")
                return current
            }

            const questionIndex = current.questions.findIndex((question) => question.id === questionId)
            const filteredQuestions = current.questions.filter((question) => question.id !== questionId)

            if (selectedQuestionId === questionId) {
                const fallbackIndex = Math.min(
                    Math.max(questionIndex, 0),
                    Math.max(filteredQuestions.length - 1, 0)
                )
                nextSelectedId = filteredQuestions[fallbackIndex]?.id || ""
            }

            return {
                ...current,
                questions: filteredQuestions,
            }
        })

        setSelectedQuestionId((currentId) => (currentId === questionId ? nextSelectedId : currentId))
    }

    const handleAddQuestion = () => {
        const newQuestion = createEmptyQuestion()
        setDraftExam((current) => ({
            ...current,
            questions: [...current.questions, newQuestion],
        }))
        setSelectedQuestionId(newQuestion.id)
    }

    const handleSaveExam = async () => {
        // Warn if trying to publish without duration
        if (draftExam.status === "PUBLISHED" && (!draftExam.durationMinutes || draftExam.durationMinutes <= 0)) {
            const confirmed = window.confirm(
                "Đề thi chưa có thời gian làm bài. Học sinh sẽ không thể làm bài nếu không có thời gian. Bạn có muốn tiếp tục lưu với trạng thái PUBLISHED không?"
            )
            if (!confirmed) {
                return
            }
        }

        try {
            setIsSaving(true)
            const updatedExam = await onSave({
                title: draftExam.title,
                status: draftExam.status,
                code: draftExam.code,
                questions: draftExam.questions,
                durationMinutes: draftExam.durationMinutes,
            })
            const normalized = normalizeExam(updatedExam)
            setDraftExam(normalized)
            setSelectedQuestionId((currentId) => {
                if (normalized.questions.some((question) => question.id === currentId)) {
                    return currentId
                }
                return normalized.questions[0]?.id || ""
            })
            toast.success("Đã lưu đề thi thành công.")
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Không thể lưu đề thi.")
        } finally {
            setIsSaving(false)
        }
    }

    const handleMouseDown = () => setIsResizing(true)
    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isResizing) return
        const container = event.currentTarget
        const rect = container.getBoundingClientRect()
        const newWidth = ((event.clientX - rect.left) / rect.width) * 100

        if (newWidth >= 20 && newWidth <= 40) {
            setLeftWidth(newWidth)
        }
    }
    const handleMouseUp = () => setIsResizing(false)

    const isPageVariant = variant === "page"
    const wrapperClass = isPageVariant ? "min-h-screen bg-gray-50" : "rounded-2xl border bg-white shadow-sm"
    const contentClass = isPageVariant ? "container mx-auto p-4" : "p-4"

    return (
        <div className={wrapperClass}>
            {showHeader && (
                <ExamEditorHeader
                    title={draftExam.title}
                    code={draftExam.code}
                    questionCount={draftExam.questions.length}
                    status={draftExam.status}
                    durationMinutes={draftExam.durationMinutes}
                    onTitleChange={(value) =>
                        setDraftExam((current) => ({
                            ...current,
                            title: value,
                        }))
                    }
                    onStatusChange={(value) =>
                        setDraftExam((current) => ({
                            ...current,
                            status: value,
                        }))
                    }
                    onDurationChange={(value) =>
                        setDraftExam((current) => ({
                            ...current,
                            durationMinutes: value,
                        }))
                    }
                    onBack={onBack}
                    onPrimaryAction={handleSaveExam}
                    isPrimaryActionLoading={isSaving}
                    primaryActionLabel={primaryActionLabel}
                    isSticky={isPageVariant}
                    useContainer={isPageVariant}
                />
            )}

            <div
                className={`${contentClass} flex gap-4 relative`}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div style={{ width: `${leftWidth}%` }} className="shrink-0">
                    <QuestionList
                        questions={draftExam.questions}
                        selectedQuestionId={selectedQuestionId}
                        onSelect={setSelectedQuestionId}
                        onAddQuestion={handleAddQuestion}
                        onDeleteQuestion={handleDeleteQuestion}
                        sticky={isPageVariant}
                    />
                </div>

                <div
                    className={`w-1 cursor-col-resize hover:bg-primary/50 transition-colors shrink-0 relative group ${
                        isResizing ? "bg-primary" : ""
                    }`}
                    onMouseDown={handleMouseDown}
                >
                    <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center">
                        <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <QuestionPanel
                        question={selectedQuestion}
                        index={selectedIndex}
                        total={draftExam.questions.length}
                        onUpdateQuestion={handleQuestionUpdate}
                        onDeleteQuestion={handleDeleteQuestion}
                        onNavigatePrevious={() => {
                            if (selectedIndex <= 0) return
                            setSelectedQuestionId(draftExam.questions[selectedIndex - 1].id)
                        }}
                        onNavigateNext={() => {
                            if (selectedIndex === draftExam.questions.length - 1) return
                            setSelectedQuestionId(draftExam.questions[selectedIndex + 1].id)
                        }}
                        stickyNavigation={isPageVariant}
                    />
                </div>
            </div>
        </div>
    )
}

