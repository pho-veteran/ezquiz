import type { Question } from "@/types"

/**
 * Checks if a question meets the criteria for saving:
 * - Has non-empty content
 * - Has at least 2 filled options (non-empty strings)
 */
export function isQuestionValidForSave(question: Question): boolean {
    const hasContent = question.content.trim().length > 0
    const filledOptions = question.options.filter((option) => option.trim().length > 0)
    const hasAtLeastTwoOptions = filledOptions.length >= 2

    return hasContent && hasAtLeastTwoOptions
}

