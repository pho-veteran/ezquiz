export interface QuestionPayload {
    id?: string
    content: string
    options: string[]
    correctIdx: number
    explanation?: string
}

interface QuestionValidationOptions {
    requireArray?: boolean
}

interface QuestionValidationResult {
    questions: QuestionPayload[]
    errors: string[]
}

const OPTION_COUNT = 4

export function validateQuestionsPayload(
    rawQuestions: unknown,
    options: QuestionValidationOptions = {}
): QuestionValidationResult {
    const { requireArray = false } = options

    if (rawQuestions === undefined || rawQuestions === null) {
        return requireArray
            ? { questions: [], errors: ["Questions field is required."] }
            : { questions: [], errors: [] }
    }

    if (!Array.isArray(rawQuestions)) {
        return {
            questions: [],
            errors: ["Questions must be an array."],
        }
    }

    const questions: QuestionPayload[] = []
    const errors: string[] = []

    rawQuestions.forEach((rawQuestion, index) => {
        const questionNumber = index + 1

        if (!rawQuestion || typeof rawQuestion !== "object") {
            errors.push(`Question #${questionNumber} must be an object.`)
            return
        }

        const { id, content, options: rawOptions, correctIdx, explanation } = rawQuestion as Record<
            string,
            unknown
        >

        if (id !== undefined && typeof id !== "string") {
            errors.push(`Question #${questionNumber} has an invalid id.`)
            return
        }

        if (typeof content !== "string" || content.trim().length === 0) {
            errors.push(`Question #${questionNumber} must include non-empty content.`)
            return
        }

        if (!Array.isArray(rawOptions)) {
            errors.push(`Question #${questionNumber} must include an options array.`)
            return
        }

        if (rawOptions.length !== OPTION_COUNT) {
            errors.push(`Question #${questionNumber} must include exactly ${OPTION_COUNT} options.`)
            return
        }

        const optionsAreValid = rawOptions.every(
            (option) => typeof option === "string" && option.trim().length > 0
        )

        if (!optionsAreValid) {
            errors.push(`Question #${questionNumber} options must be non-empty strings.`)
            return
        }

        const normalizedOptions = rawOptions.map((option) => option.trim())

        const parsedCorrectIdx =
            typeof correctIdx === "number"
                ? correctIdx
                : typeof correctIdx === "string"
                    ? parseInt(correctIdx, 10)
                    : NaN

        if (!Number.isInteger(parsedCorrectIdx)) {
            errors.push(`Question #${questionNumber} must include a valid correctIdx.`)
            return
        }

        if (parsedCorrectIdx < 0 || parsedCorrectIdx >= normalizedOptions.length) {
            errors.push(`Question #${questionNumber} correctIdx is out of bounds.`)
            return
        }

        if (explanation !== undefined && explanation !== null && typeof explanation !== "string") {
            errors.push(`Question #${questionNumber} explanation must be a string if provided.`)
            return
        }

        questions.push({
            id: typeof id === "string" ? id : undefined,
            content: content.trim(),
            options: normalizedOptions,
            correctIdx: parsedCorrectIdx,
            explanation:
                typeof explanation === "string" && explanation.trim().length > 0
                    ? explanation.trim()
                    : undefined,
        })
    })

    return { questions, errors }
}

