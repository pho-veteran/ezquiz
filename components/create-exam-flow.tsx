"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { ExamEditor, type ExamEditorSavePayload } from "@/components/exam-editor"
import type { Exam } from "@/types"
import { Loader2, UploadCloud, CheckCircle2, Save, ChevronRight, ChevronLeft, FileText, AlertCircle, RefreshCcw } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { getExamByCode, updateExam } from "@/lib/exam-service"

type Step = 1 | 2 | 3 | 4

const STEPS = [
    { number: 1, title: "Nhập nội dung", description: "Upload hoặc paste văn bản" },
    { number: 2, title: "Xử lý AI", description: "Tạo câu hỏi tự động" },
    { number: 3, title: "Xem lại & Chỉnh sửa", description: "Kiểm tra và điều chỉnh" },
    { number: 4, title: "Hoàn thành", description: "Xuất bản đề thi" },
]

export default function CreateExamFlow() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState<Step>(1)
    const [content, setContent] = useState("")
    const [examTitle, setExamTitle] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [numQuestions, setNumQuestions] = useState(10)
    const [examCode, setExamCode] = useState("")
    const [draftExam, setDraftExam] = useState<Exam | null>(null)
    const [progress, setProgress] = useState(0)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isDraftLoading, setIsDraftLoading] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setContent("") // Clear text content when file is selected
        }
    }

    const refreshDraftExam = async (code: string) => {
        try {
            setIsDraftLoading(true)
            const exam = await getExamByCode(code)
            setDraftExam(exam)
        } catch (err) {
            console.error("Error loading draft exam:", err)
            toast.error(err instanceof Error ? err.message : "Không thể tải đề thi vừa tạo.")
        } finally {
            setIsDraftLoading(false)
        }
    }

    const handleGenerate = async () => {
        if ((!content.trim() && !file) || !examTitle.trim()) {
            toast.error("Please provide both a title and document content")
            return
        }

        setIsGenerating(true)
        setError(null)
        setCurrentStep(2)
        setProgress(0)

        // Simulate progress
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 90) return prev
                return prev + 10
            })
        }, 500)

        try {
            // Prepare form data
            const formData = new FormData()
            
            if (file) {
                formData.append("file", file)
            } else {
                // Create a text file from content
                const textBlob = new Blob([content], { type: "text/plain" })
                const textFile = new File([textBlob], "content.txt", { type: "text/plain" })
                formData.append("file", textFile)
            }
            
            formData.append("title", examTitle.trim())
            formData.append("numQuestions", numQuestions.toString())

            // Call API endpoint
            const response = await fetch("/api/generate-exam", {
                method: "POST",
                body: formData,
            })

            const data = await response.json()

            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to generate exam")
            }

            // Success! Save exam details
            setExamCode(data.examCode)
            await refreshDraftExam(data.examCode)
            setProgress(100)
            clearInterval(progressInterval)
            setIsGenerating(false)
            toast.success(`Generated ${data.questionsCount} questions successfully!`)
            setCurrentStep(3)

        } catch (err) {
            console.error("Error generating exam:", err)
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred"
            setError(errorMessage)
            clearInterval(progressInterval)
            setIsGenerating(false)
            setCurrentStep(1)
            toast.error(errorMessage)
        }
    }

    const handleDraftSave = async (payload: ExamEditorSavePayload) => {
        if (!examCode) {
            throw new Error("Chưa có mã đề thi để lưu.")
        }
        const updated = await updateExam({ code: examCode }, payload)
        setDraftExam(updated)
        return updated
    }

    const handlePublish = async () => {
        if (!examCode) {
            toast.error("Không tìm thấy mã đề thi.")
            return
        }

        // Warn if duration is not set
        if (!draftExam?.durationMinutes || draftExam.durationMinutes <= 0) {
            const confirmed = window.confirm(
                "Đề thi chưa có thời gian làm bài. Học sinh sẽ không thể làm bài nếu không có thời gian. Bạn có muốn tiếp tục xuất bản không?"
            )
            if (!confirmed) {
                return
            }
        }

        try {
            setIsPublishing(true)
            const updatedExam = await updateExam(
                { code: examCode },
                { status: "PUBLISHED" }
            )
            setDraftExam(updatedExam)
        setCurrentStep(4)
            toast.success("Đề thi đã được xuất bản.")
        } catch (err) {
            console.error("Error publishing exam:", err)
            toast.error(err instanceof Error ? err.message : "Không thể xuất bản đề thi.")
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Stepper */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {STEPS.map((step, index) => (
                        <div key={step.number} className="flex items-center flex-1">
                            <div className="flex flex-col items-center flex-1">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${currentStep >= step.number
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-gray-200 text-gray-500'
                                    }`}>
                                    {currentStep > step.number ? (
                                        <CheckCircle2 className="w-5 h-5" />
                                    ) : (
                                        step.number
                                    )}
                                </div>
                                <div className="mt-2 text-center">
                                    <div className={`text-sm font-medium ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                                        }`}>
                                        {step.title}
                                    </div>
                                    <div className="text-xs text-muted-foreground hidden sm:block">
                                        {step.description}
                                    </div>
                                </div>
                            </div>
                            {index < STEPS.length - 1 && (
                                <Separator className={`flex-1 mx-4 ${currentStep > step.number ? 'bg-primary' : 'bg-gray-200'
                                    }`} />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Step 1: Input */}
            {currentStep === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Tạo đề thi mới</CardTitle>
                        <CardDescription>Nhập thông tin và nội dung để AI tạo câu hỏi tự động.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Tên đề thi</Label>
                            <Input
                                id="title"
                                placeholder="Ví dụ: Kiểm tra Toán 12 - Chương 1"
                                value={examTitle}
                                onChange={(e) => setExamTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="numQuestions">Số lượng câu hỏi</Label>
                            <Input
                                id="numQuestions"
                                type="number"
                                min="1"
                                max="50"
                                placeholder="10"
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label>Tải lên tài liệu</Label>
                            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors">
                                <input
                                    type="file"
                                    id="file-upload"
                                    className="hidden"
                                    accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.webp,.gif"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="file-upload" className="cursor-pointer">
                                    {file ? (
                                        <div className="flex flex-col items-center">
                                            <FileText className="h-12 w-12 text-green-600 mb-2" />
                                            <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Kéo thả file vào đây hoặc click để tải lên
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                (Hỗ trợ PDF, TXT, DOCX, JPG, PNG, WEBP, GIF)
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Hoặc dán nội dung văn bản</Label>
                            <Textarea
                                placeholder="Dán nội dung bài học vào đây..."
                                className="min-h-[200px]"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={!!file}
                            />
                            {file && (
                                <p className="text-xs text-muted-foreground">
                                    Xóa file đã chọn để nhập văn bản
                                </p>
                            )}
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-900">Lỗi</p>
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        {file && (
                            <Button 
                                variant="outline" 
                                onClick={() => setFile(null)}
                            >
                                Xóa file
                            </Button>
                        )}
                        <Button 
                            onClick={handleGenerate} 
                            disabled={(!content.trim() && !file) || !examTitle.trim() || isGenerating}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    Tạo đề thi
                                    <ChevronRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {/* Step 2: Loading */}
            {currentStep === 2 && (
                <Card className="text-center py-12">
                    <CardContent className="space-y-6">
                        <div className="relative mx-auto w-24 h-24">
                            <Loader2 className="w-24 h-24 animate-spin text-primary" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Đang phân tích nội dung...</h3>
                            <p className="text-muted-foreground">
                                AI đang trích xuất kiến thức và tạo {numQuestions} câu hỏi trắc nghiệm.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Quá trình này có thể mất vài phút tùy thuộc vào độ dài tài liệu.
                            </p>
                        </div>
                        <Progress value={progress} className="w-[60%] mx-auto" />
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <CardTitle>
                                        {draftExam ? `Xem lại đề thi: ${draftExam.title}` : "Xem lại đề thi"}
                                    </CardTitle>
                                    <CardDescription>
                                        Toàn bộ thay đổi được lưu trực tiếp vào bản nháp đã tạo.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => examCode && window.open(`/exam/${examCode}/edit`, "_blank")}
                                        disabled={!examCode}
                                    >
                                        Mở tab chỉnh sửa
                                    </Button>
                                    <Button onClick={handlePublish} disabled={isPublishing || !examCode}>
                                        {isPublishing ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Đang xuất bản...
                                            </>
                                        ) : (
                                            <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Xuất bản
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {isDraftLoading || !draftExam ? (
                        <Card className="py-12 text-center">
                            <CardContent className="space-y-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                                <p className="text-muted-foreground">Đang tải bản nháp đề thi...</p>
                                {examCode && (
                                    <Button variant="outline" onClick={() => refreshDraftExam(examCode)}>
                                        Thử lại
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <ExamEditor
                            exam={draftExam}
                            onSave={handleDraftSave}
                            primaryActionLabel="Lưu bản nháp"
                            variant="embedded"
                        />
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(1)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Quay lại
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => examCode && refreshDraftExam(examCode)}
                            disabled={isDraftLoading || !examCode}
                        >
                            <RefreshCcw className="mr-2 h-4 w-4" />
                            Làm mới dữ liệu
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 4: Published */}
            {currentStep === 4 && (
                <Card className="text-center py-12">
                    <CardContent className="space-y-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-green-700">Xuất bản thành công!</h3>
                            <p className="text-muted-foreground">
                                Đề thi &quot;{draftExam?.title ?? examTitle}&rdquo; đã sẵn sàng.
                            </p>
                        </div>

                        <div className="bg-gray-100 p-6 rounded-lg max-w-md mx-auto">
                            <p className="text-sm text-muted-foreground mb-2">Mã phòng thi</p>
                            <p className="text-4xl font-mono font-bold tracking-wider">{examCode}</p>
                        </div>

                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => router.push("/dashboard")}>
                                Về Dashboard
                            </Button>
                            <Button onClick={() => {
                                navigator.clipboard.writeText(examCode)
                            }}>
                                Copy Mã Phòng
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
