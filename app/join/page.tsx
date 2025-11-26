"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LogInIcon, Loader2 } from "lucide-react"
import { ExamConfirmationModal } from "@/components/exam-confirmation-modal"
import { apiClient } from "@/lib/api-client"
import { toast } from "sonner"

function JoinExamContent() {
    const searchParams = useSearchParams()
    const [code, setCode] = useState("")
    const [error, setError] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [isValidating, setIsValidating] = useState(false)

    useEffect(() => {
        const codeParam = searchParams.get("code")
        if (codeParam) {
            setCode(codeParam.toUpperCase())
        }
    }, [searchParams])

    const handleJoin = async () => {
        if (!code.trim()) {
            setError("Vui lòng nhập mã phòng")
            return
        }

        try {
            setIsValidating(true)
            setError("")

            // Validate exam exists and is PUBLISHED
            const response = await apiClient.get(`/exams/${code}`)

            if (!response.data.success || !response.data.data) {
                throw new Error(response.data.error || "Không tìm thấy đề thi")
            }

            const exam = response.data.data

            if (exam.status !== "PUBLISHED") {
                throw new Error(
                    `Đề thi không khả dụng. Trạng thái hiện tại: ${exam.status}`
                )
            }

            // Show confirmation modal
            setShowModal(true)
        } catch (err) {
            console.error("Error validating exam:", err)
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Không thể kiểm tra đề thi"
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setIsValidating(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Vào Phòng Thi</CardTitle>
                    <CardDescription>Nhập mã phòng thi do giáo viên cung cấp</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Mã Phòng Thi</Label>
                        <Input
                            id="code"
                            placeholder="Ví dụ: CODE123"
                            className="text-center text-lg uppercase tracking-widest"
                            value={code}
                            onChange={(e) => {
                                setCode(e.target.value.toUpperCase())
                                setError("")
                            }}
                            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        />
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </div>
                </CardContent>
                <CardFooter>
                    <Button
                        className="w-full"
                        size="lg"
                        onClick={handleJoin}
                        disabled={isValidating}
                    >
                        <LogInIcon className="mr-2 h-4 w-4" />
                        {isValidating ? "Đang kiểm tra..." : "Vào Thi Ngay"}
                    </Button>
                </CardFooter>
            </Card>

            {showModal && (
                <ExamConfirmationModal
                    examCode={code.trim()}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}

export default function JoinExamPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="pt-6 text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            <p className="text-muted-foreground">Đang tải...</p>
                        </CardContent>
                    </Card>
                </div>
            }
        >
            <JoinExamContent />
        </Suspense>
    )
}
