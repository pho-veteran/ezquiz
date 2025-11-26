export interface ScoreResult {
    score: number
    correctCount: number
    total: number
    percentage: number
    perQuestionCorrect: boolean[]
}

type QuestionWithScore = {
    id: string
    correctIdx: number
}

/**
 * Calculate exam score from answers
 * Server-side scoring function that doesn't mutate state
 */
export function calculateScore(
    exam: { questions: QuestionWithScore[] },
    answers: Record<string, number>
): ScoreResult {
    const total = exam.questions.length
    const perQuestionCorrect: boolean[] = []
    let correctCount = 0

    exam.questions.forEach((question) => {
        const userAnswer = answers[question.id]
        const isCorrect =
            userAnswer !== undefined && userAnswer === question.correctIdx

        perQuestionCorrect.push(isCorrect)

        if (isCorrect) {
            correctCount++
        }
    })

    const score = total > 0 ? (correctCount / total) * 100 : 0
    const percentage = Math.round(score * 100) / 100

    return {
        score,
        correctCount,
        total,
        percentage,
        perQuestionCorrect,
    }
}

