"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ExamEditor, type ExamEditorSavePayload } from "@/components/exam-editor"
import { getExamByCode, updateExam } from "@/lib/exam-service"
import type { Exam } from "@/types"
import { Loader2 } from "lucide-react"

export default function EditExamPage() {
    const router = useRouter()
    const params = useParams<{ code: string }>()
    const examCode = params.code

    const [exam, setExam] = useState<Exam | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchExam = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)
            const data = await getExamByCode(examCode)
            setExam(data)
        } catch (err) {
            console.error(err)
            setError(err instanceof Error ? err.message : "Không thể tải đề thi.")
        } finally {
            setIsLoading(false)
        }
    }, [examCode])

    useEffect(() => {
        if (examCode) {
            fetchExam()
        }
    }, [examCode, fetchExam])

    const handleSave = async (payload: ExamEditorSavePayload) => {
        const updatedExam = await updateExam({ code: examCode }, payload)
        setExam(updatedExam)
        router.push("/dashboard")
        return updatedExam
    }

    if (isLoading || !exam) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4 text-center">
                {isLoading ? (
                    <>
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Đang tải đề thi...</p>
                    </>
                ) : (
                    <>
                        <p className="text-muted-foreground">{error ?? "Không tìm thấy đề thi."}</p>
                        <Button onClick={fetchExam}>Thử lại</Button>
                    </>
                )}
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center space-y-4 text-center">
                <p className="text-destructive">{error}</p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/dashboard")}>
                        Về dashboard
                    </Button>
                    <Button onClick={fetchExam}>Thử lại</Button>
                </div>
            </div>
        )
    }

    return (
        <ExamEditor
            exam={exam}
            onSave={handleSave}
            onBack={() => router.push("/dashboard")}
            primaryActionLabel="Lưu thay đổi"
        />
    )
}
