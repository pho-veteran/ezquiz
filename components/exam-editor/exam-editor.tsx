"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { ExamEditorHeader } from "@/components/exam-editor/exam-editor-header"
import { QuestionList } from "@/components/exam-editor/question-list"
import { QuestionPanel } from "@/components/exam-editor/question-panel"
import { SaveConfirmationModal } from "@/components/exam-editor/save-confirmation-modal"
import { isQuestionValidForSave } from "@/lib/question-validation"
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

export interface ExamEditorProps {
    exam: Exam
    onSave: (payload: ExamEditorSavePayload) => Promise<Exam>
    onBack?: () => void
    primaryActionLabel?: string
    showHeader?: boolean
    variant?: ExamEditorVariant
    onDurationChange?: (value: number | null) => void
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
    onDurationChange,
}: ExamEditorProps) {
    const [draftExam, setDraftExam] = useState<Exam>(() => normalizeExam(exam))
    const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
        () => draftExam.questions[0]?.id || ""
    )
    const [leftWidth, setLeftWidth] = useState(25)
    const [isResizing, setIsResizing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showConfirmationModal, setShowConfirmationModal] = useState(false)
    const [incompleteQuestions, setIncompleteQuestions] = useState<
        Array<{ question: Question; index: number }>
    >([])

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
        setDraftExam((current) => {
            if (current.questions.length <= 1) {
                // If it's the only question, create a new empty one
                const newQuestion = createEmptyQuestion()
                return {
                    ...current,
                    questions: [newQuestion],
                }
            }

            const questionIndex = current.questions.findIndex((question) => question.id === questionId)
            const filteredQuestions = current.questions.filter((question) => question.id !== questionId)

            // Handle navigation when deleting the currently selected question
            if (selectedQuestionId === questionId) {
                let nextSelectedId: string

                if (questionIndex < filteredQuestions.length) {
                    // If there are questions after this one, navigate to the next
                    nextSelectedId = filteredQuestions[questionIndex].id
                } else if (questionIndex > 0) {
                    // If it's the last question, navigate to the previous one
                    nextSelectedId = filteredQuestions[questionIndex - 1].id
                } else {
                    // Fallback: select the first question
                    nextSelectedId = filteredQuestions[0]?.id || ""
                }

                setSelectedQuestionId(nextSelectedId)
            }

            return {
                ...current,
                questions: filteredQuestions,
            }
        })
    }

    const handleAddQuestion = () => {
        const newQuestion = createEmptyQuestion()
        setDraftExam((current) => ({
            ...current,
            questions: [...current.questions, newQuestion],
        }))
        setSelectedQuestionId(newQuestion.id)
    }

    const performSave = async (questionsToSave: Question[]) => {
        setIsSaving(true)
        try {
            const updatedExam = await onSave({
                title: draftExam.title,
                status: draftExam.status,
                code: draftExam.code,
                questions: questionsToSave,
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
            const errorMessage = error instanceof Error ? error.message : "Không thể lưu đề thi."

            // Try to parse question validation errors from the API
            const questionErrors = parseQuestionErrors(errorMessage)
            if (questionErrors.length > 0) {
                // Find incomplete questions based on error messages
                const incomplete = draftExam.questions
                    .map((q, idx) => ({ question: q, index: idx }))
                    .filter(({ question }) => !isQuestionValidForSave(question))

                if (incomplete.length > 0) {
                    setIncompleteQuestions(incomplete)
                    setShowConfirmationModal(true)
                    return
                }
            }

            // Handle other errors (code conflicts, network errors, etc.)
            if (errorMessage.includes("code already exists") || errorMessage.includes("Exam code")) {
                toast.error("Mã đề thi đã tồn tại. Vui lòng chọn mã khác.")
            } else {
                toast.error(errorMessage)
            }
        } finally {
            setIsSaving(false)
        }
    }

    const parseQuestionErrors = (errorMessage: string): number[] => {
        // Parse error messages like "Question #1 must include non-empty content."
        const questionErrorRegex = /Question #(\d+)/g
        const questionNumbers: number[] = []
        let match

        while ((match = questionErrorRegex.exec(errorMessage)) !== null) {
            const questionNum = parseInt(match[1], 10)
            if (!questionNumbers.includes(questionNum)) {
                questionNumbers.push(questionNum)
            }
        }

        return questionNumbers
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

        // Check for incomplete questions before saving
        const incomplete = draftExam.questions
            .map((q, idx) => ({ question: q, index: idx }))
            .filter(({ question }) => !isQuestionValidForSave(question))

        if (incomplete.length > 0) {
            setIncompleteQuestions(incomplete)
            setShowConfirmationModal(true)
            return
        }

        // All questions are valid, proceed with save
        await performSave(draftExam.questions)
    }

    const handleConfirmSave = async () => {
        setShowConfirmationModal(false)

        // Filter out incomplete questions
        const validQuestions = draftExam.questions.filter(isQuestionValidForSave)

        if (validQuestions.length === 0) {
            toast.error("Không có câu hỏi hợp lệ để lưu. Vui lòng thêm ít nhất một câu hỏi hoàn chỉnh.")
            return
        }

        // Update draft exam to remove invalid questions
        setDraftExam((current) => ({
            ...current,
            questions: validQuestions,
        }))

        // Perform the save with filtered questions
        await performSave(validQuestions)
    }

    const handleCancelSave = () => {
        setShowConfirmationModal(false)
        setIncompleteQuestions([])
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
                    onDurationChange={(value) => {
                        setDraftExam((current) => ({
                            ...current,
                            durationMinutes: value,
                        }))
                        onDurationChange?.(value)
                    }}
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

            {showConfirmationModal && (
                <SaveConfirmationModal
                    incompleteQuestions={incompleteQuestions}
                    onConfirm={handleConfirmSave}
                    onCancel={handleCancelSave}
                />
            )}
        </div>
    )
}

