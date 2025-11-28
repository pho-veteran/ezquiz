"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { X } from "lucide-react"

export interface ExamOptions {
    practicalRatio?: number | null // 0-100, null = auto
    difficultyDistribution?: {
        easy: number
        medium: number
        hard: number
    } | null
    language?: "auto" | "vi" | "en"
    explanationStyle?: "auto" | "detailed" | "concise"
}

interface ExamOptionsModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (options: ExamOptions) => void
    initialOptions?: ExamOptions
}

export function ExamOptionsModal({
    isOpen,
    onClose,
    onSave,
    initialOptions,
}: ExamOptionsModalProps) {
    const [practicalRatio, setPracticalRatio] = useState<number | null>(
        initialOptions?.practicalRatio ?? null
    )
    const [difficultyDistribution, setDifficultyDistribution] = useState<{
        easy: number
        medium: number
        hard: number
    } | null>(initialOptions?.difficultyDistribution ?? null)
    
    // Two-handle slider values: [Easy/Medium boundary, Medium/Hard boundary]
    const [difficultyBoundaries, setDifficultyBoundaries] = useState<[number, number]>(
        initialOptions?.difficultyDistribution
            ? [
                  initialOptions.difficultyDistribution.easy,
                  initialOptions.difficultyDistribution.easy +
                      initialOptions.difficultyDistribution.medium,
              ]
            : [33, 67]
    )
    const [language, setLanguage] = useState<"auto" | "vi" | "en">(
        initialOptions?.language ?? "auto"
    )
    const [explanationStyle, setExplanationStyle] = useState<
        "auto" | "detailed" | "concise"
    >(initialOptions?.explanationStyle ?? "auto")
    // Initialize difficulty distribution if enabled
    const [useDifficultyDistribution, setUseDifficultyDistribution] = useState(
        initialOptions?.difficultyDistribution !== null &&
            initialOptions?.difficultyDistribution !== undefined
    )

    // Update state when modal opens with new initialOptions
    useEffect(() => {
        if (isOpen && initialOptions) {
            setPracticalRatio(initialOptions.practicalRatio ?? null)
            setDifficultyDistribution(initialOptions.difficultyDistribution ?? null)
            if (initialOptions.difficultyDistribution) {
                setDifficultyBoundaries([
                    initialOptions.difficultyDistribution.easy,
                    initialOptions.difficultyDistribution.easy +
                        initialOptions.difficultyDistribution.medium,
                ])
            }
            setLanguage(initialOptions.language ?? "auto")
            setExplanationStyle(initialOptions.explanationStyle ?? "auto")
            setUseDifficultyDistribution(
                initialOptions.difficultyDistribution !== null &&
                    initialOptions.difficultyDistribution !== undefined
            )
        }
        // Only run when modal opens - initialOptions is intentionally excluded from deps
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    if (!isOpen) return null

    const handleSave = () => {
        const options: ExamOptions = {
            practicalRatio: practicalRatio,
            difficultyDistribution: useDifficultyDistribution
                ? difficultyDistribution
                : null,
            language: language,
            explanationStyle: explanationStyle,
        }
        onSave(options)
        onClose()
    }

    const handleDifficultyBoundariesChange = (values: number[]) => {
        const [easyBoundary, mediumBoundary] = values
        // Ensure boundaries are in correct order and within bounds
        const clampedEasy = Math.max(0, Math.min(100, easyBoundary))
        const clampedMedium = Math.max(clampedEasy, Math.min(100, mediumBoundary))
        
        setDifficultyBoundaries([clampedEasy, clampedMedium])
        
        // Calculate percentages
        const easy = clampedEasy
        const medium = clampedMedium - clampedEasy
        const hard = 100 - clampedMedium
        
        setDifficultyDistribution({ easy, medium, hard })
    }

    const theoreticalRatio = practicalRatio !== null ? 100 - practicalRatio : null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Tùy chọn nâng cao</CardTitle>
                            <CardDescription>
                                Tùy chỉnh cách AI tạo câu hỏi (tất cả đều tùy chọn)
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Practical/Theoretical Ratio */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                                Tỷ lệ Thực hành/Lý thuyết
                            </Label>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPracticalRatio(null)}
                                className="h-7 text-xs"
                            >
                                Đặt lại (Tự động)
                            </Button>
                        </div>
                        <div className="space-y-2">
                            <Slider
                                value={
                                    practicalRatio !== null ? [practicalRatio] : [50]
                                }
                                onValueChange={(value) =>
                                    setPracticalRatio(value[0])
                                }
                                min={0}
                                max={100}
                                step={1}
                                className="w-full"
                            />
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {practicalRatio !== null
                                        ? `Thực hành: ${practicalRatio}% | Lý thuyết: ${theoreticalRatio}%`
                                        : "Tự động (AI quyết định)"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Difficulty Distribution */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">
                                Phân bổ độ khó
                            </Label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="use-difficulty"
                                    checked={useDifficultyDistribution}
                                    onChange={(e) => {
                                        setUseDifficultyDistribution(e.target.checked)
                                        if (e.target.checked && !difficultyDistribution) {
                                            setDifficultyBoundaries([33, 67])
                                            setDifficultyDistribution({
                                                easy: 33,
                                                medium: 34,
                                                hard: 33,
                                            })
                                        }
                                    }}
                                    className="h-4 w-4"
                                />
                                <Label
                                    htmlFor="use-difficulty"
                                    className="text-sm font-normal cursor-pointer"
                                >
                                    Bật phân bổ độ khó
                                </Label>
                            </div>
                        </div>
                        {useDifficultyDistribution && (
                            <div className="space-y-4 pl-4 border-l-2">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            Kéo hai điểm để điều chỉnh phân bổ độ khó
                                        </span>
                                    </div>
                                    <Slider
                                        value={difficultyBoundaries}
                                        onValueChange={handleDifficultyBoundariesChange}
                                        min={0}
                                        max={100}
                                        step={1}
                                        className="w-full"
                                    />
                                    <div className="grid grid-cols-3 gap-4 pt-2">
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-green-600">
                                                Dễ
                                            </div>
                                            <div className="text-lg font-bold">
                                                {difficultyDistribution?.easy ?? 33}%
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-yellow-600">
                                                Trung bình
                                            </div>
                                            <div className="text-lg font-bold">
                                                {difficultyDistribution?.medium ?? 34}%
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold text-red-600">
                                                Khó
                                            </div>
                                            <div className="text-lg font-bold">
                                                {difficultyDistribution?.hard ?? 33}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground pt-2 border-t text-center">
                                        Tổng:{" "}
                                        {difficultyDistribution
                                            ? difficultyDistribution.easy +
                                              difficultyDistribution.medium +
                                              difficultyDistribution.hard
                                            : 100}
                                        %
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Language Preference */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">
                            Ngôn ngữ ưu tiên
                        </Label>
                        <RadioGroup
                            value={language}
                            onValueChange={(value) =>
                                setLanguage(value as "auto" | "vi" | "en")
                            }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="auto" id="lang-auto" />
                                <Label htmlFor="lang-auto" className="cursor-pointer">
                                    Tự động phát hiện
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="vi" id="lang-vi" />
                                <Label htmlFor="lang-vi" className="cursor-pointer">
                                    Tiếng Việt
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="en" id="lang-en" />
                                <Label htmlFor="lang-en" className="cursor-pointer">
                                    English
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <Separator />

                    {/* Explanation Style */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">
                            Phong cách giải thích
                        </Label>
                        <RadioGroup
                            value={explanationStyle}
                            onValueChange={(value) =>
                                setExplanationStyle(
                                    value as "auto" | "detailed" | "concise"
                                )
                            }
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="auto" id="exp-auto" />
                                <Label htmlFor="exp-auto" className="cursor-pointer">
                                    Tự động
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="detailed" id="exp-detailed" />
                                <Label htmlFor="exp-detailed" className="cursor-pointer">
                                    Chi tiết
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="concise" id="exp-concise" />
                                <Label htmlFor="exp-concise" className="cursor-pointer">
                                    Ngắn gọn
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Hủy
                        </Button>
                        <Button onClick={handleSave} className="flex-1">
                            Lưu tùy chọn
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

