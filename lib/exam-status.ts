export const EXAM_STATUSES = ["DRAFT", "PUBLISHED", "ENDED"] as const

export type ExamStatus = (typeof EXAM_STATUSES)[number]

export const DEFAULT_EXAM_STATUS: ExamStatus = "DRAFT"

export function normalizeExamStatus(value?: string | null): ExamStatus | undefined {
    if (!value) return undefined

    const upperValue = value.toUpperCase().trim()
    return EXAM_STATUSES.find((status) => status === upperValue)
}

export function isExamStatus(value?: string | null): value is ExamStatus {
    return Boolean(normalizeExamStatus(value))
}

