"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { ExamStatus } from "@/lib/exam-status"
import { toast } from "sonner"
import { ChevronDown, ChevronLeft, Copy, Loader2, Save } from "lucide-react"

interface ExamEditorHeaderProps {
    title: string
    code: string
    questionCount: number
    status: ExamStatus
    durationMinutes?: number | null
    onTitleChange: (value: string) => void
    onStatusChange: (value: ExamStatus) => void
    onDurationChange?: (value: number | null) => void
    onBack?: () => void
    onPrimaryAction?: () => void
    primaryActionLabel?: string
    isPrimaryActionLoading?: boolean
    isSticky?: boolean
    useContainer?: boolean
}

const STATUS_COPY: Record<
    ExamStatus,
    { label: string; description: string; dotClass: string }
> = {
    DRAFT: {
        label: "Nháp",
        description: "Chỉ mình bạn nhìn thấy",
        dotClass: "bg-yellow-500",
    },
    PUBLISHED: {
        label: "Đã công khai",
        description: "Học sinh có thể làm bài",
        dotClass: "bg-green-500",
    },
    ENDED: {
        label: "Đã kết thúc",
        description: "Không còn nhận bài nộp",
        dotClass: "bg-slate-400",
    },
}

export function ExamEditorHeader({
    title,
    code,
    questionCount,
    status,
    durationMinutes,
    onTitleChange,
    onStatusChange,
    onDurationChange,
    onBack,
    onPrimaryAction,
    primaryActionLabel = "Lưu đề thi",
    isPrimaryActionLoading = false,
    isSticky = true,
    useContainer = true,
}: ExamEditorHeaderProps) {
    const wrapperClass = cn(
        "bg-white",
        isSticky ? "border-b sticky top-0 z-20" : "border rounded-xl shadow-sm"
    )

    const innerClass = useContainer ? "container mx-auto px-4 py-4" : "px-6 py-4"

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(code)
            toast.success("Đã copy mã đề thi.")
        } catch {
            toast.error("Không thể copy mã đề.")
        }
    }

    return (
        <div className={wrapperClass}>
            <div className={innerClass}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                        <Input
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            className="text-xl font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent"
                            placeholder="Nhập tên đề thi..."
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-2">
                                        <span
                                            className={cn(
                                                "h-2.5 w-2.5 rounded-full",
                                                STATUS_COPY[status].dotClass
                                            )}
                                        />
                                        {STATUS_COPY[status].label}
                                        <ChevronDown className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-60">
                                    <DropdownMenuLabel>Trạng thái đề thi</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup
                                        value={status}
                                        onValueChange={(value) => onStatusChange(value as ExamStatus)}
                                    >
                                        {Object.entries(STATUS_COPY).map(([value, meta]) => (
                                            <DropdownMenuRadioItem key={value} value={value}>
                                                <div>
                                                    <p className="text-sm font-semibold">{meta.label}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {meta.description}
                                                    </p>
                                                </div>
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Separator orientation="vertical" className="hidden h-4 sm:block" />

                            <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold">{code}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground"
                                    onClick={handleCopyCode}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>

                            <Separator orientation="vertical" className="hidden h-4 sm:block" />

                            <span>{questionCount} câu hỏi</span>

                            {onDurationChange && (
                                <>
                                    <Separator orientation="vertical" className="hidden h-4 sm:block" />
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="duration" className="text-xs whitespace-nowrap">
                                            Thời gian:
                                        </Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={durationMinutes ?? ""}
                                            onChange={(e) => {
                                                const value = e.target.value
                                                if (value === "") {
                                                    onDurationChange(null)
                                                } else {
                                                    const num = parseInt(value, 10)
                                                    if (!isNaN(num) && num > 0) {
                                                        onDurationChange(num)
                                                    }
                                                }
                                            }}
                                            placeholder="Phút"
                                            className="w-20 h-7 text-xs"
                                        />
                                        <span className="text-xs text-muted-foreground">phút</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {onBack && (
                            <Button variant="outline" onClick={onBack}>
                                <ChevronLeft className="mr-2 h-4 w-4" />
                                Hủy
                            </Button>
                        )}
                        {onPrimaryAction && (
                            <Button onClick={onPrimaryAction} disabled={isPrimaryActionLoading}>
                                {isPrimaryActionLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {isPrimaryActionLoading ? "Đang lưu..." : primaryActionLabel}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

