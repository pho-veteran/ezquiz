"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { QuestionEditor } from "@/components/question-editor"
import { Question } from "@/types"
import { Loader2, UploadCloud, CheckCircle2, Save, ChevronRight, ChevronLeft } from "lucide-react"
import { Separator } from "@/components/ui/separator"

// Mock generated questions
const MOCK_GENERATED_QUESTIONS: Question[] = [
    {
        id: "gen1",
        text: "Thủ đô của Việt Nam là gì?",
        options: ["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng"],
        correctAnswer: 1,
    },
    {
        id: "gen2",
        text: "Ai là người sáng lập Apple?",
        options: ["Bill Gates", "Mark Zuckerberg", "Steve Jobs", "Elon Musk"],
        correctAnswer: 2,
    },
    {
        id: "gen3",
        text: "Công thức hóa học của nước là gì?",
        options: ["CO2", "H2O", "O2", "NaCl"],
        correctAnswer: 1,
    },
]

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
    const [questions, setQuestions] = useState<Question[]>([])
    const [examCode, setExamCode] = useState("")
    const [progress, setProgress] = useState(0)

    const handleGenerate = () => {
        if (!content.trim() || !examTitle.trim()) {
            return
        }

        setCurrentStep(2)
        let currentProgress = 0

        const interval = setInterval(() => {
            currentProgress += 10
            setProgress(currentProgress)

            if (currentProgress >= 100) {
                clearInterval(interval)
                setQuestions(MOCK_GENERATED_QUESTIONS)
                setCurrentStep(3)
            }
        }, 300)
    }

    const handleUpdateQuestion = (id: string, updates: Partial<Question>) => {
        setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q))
    }

    const handleDeleteQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id))
    }

    const handleAddQuestion = () => {
        const newQuestion: Question = {
            id: `new_${Date.now()}`,
            text: "",
            options: ["", "", "", ""],
            correctAnswer: 0
        }
        setQuestions([...questions, newQuestion])
    }

    const handlePublish = () => {
        const code = "EXAM" + Math.floor(1000 + Math.random() * 9000)
        setExamCode(code)
        setCurrentStep(4)
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

                        <Separator />

                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer">
                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">Kéo thả file vào đây hoặc click để tải lên</p>
                            <p className="text-xs text-muted-foreground mt-1">(Hỗ trợ .txt, .pdf, .docx)</p>
                        </div>

                        <div className="space-y-2">
                            <Label>Hoặc dán nội dung văn bản</Label>
                            <Textarea
                                placeholder="Dán nội dung bài học vào đây..."
                                className="min-h-[200px]"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button onClick={handleGenerate} disabled={!content.trim() || !examTitle.trim()}>
                            Tiếp theo
                            <ChevronRight className="ml-2 h-4 w-4" />
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
                            <p className="text-muted-foreground">AI đang trích xuất kiến thức và tạo câu hỏi trắc nghiệm.</p>
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
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Xem lại đề thi: {examTitle}</CardTitle>
                                    <CardDescription>Chỉnh sửa câu hỏi hoặc thêm câu hỏi mới</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={handleAddQuestion}>Thêm câu hỏi</Button>
                                    <Button onClick={handlePublish}>
                                        <Save className="mr-2 h-4 w-4" />
                                        Xuất bản
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <div className="space-y-6">
                        {questions.map((q, index) => (
                            <QuestionEditor
                                key={q.id}
                                question={q}
                                index={index}
                                onUpdate={handleUpdateQuestion}
                                onDelete={handleDeleteQuestion}
                            />
                        ))}
                    </div>

                    <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setCurrentStep(1)}>
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Quay lại
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
                            <p className="text-muted-foreground">Đề thi "{examTitle}" đã sẵn sàng.</p>
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
