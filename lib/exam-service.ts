import { apiClient } from "@/lib/api-client"
import type { ExamStatus } from "@/lib/exam-status"
import type { Exam, Question } from "@/types"

type ApiEnvelope<T> = {
    success: boolean
    data?: T
    error?: string
    [key: string]: unknown
}

type ApiExam = {
    id: string
    code: string
    title: string
    status: ExamStatus
    durationMinutes?: number | null
    createdAt: string
    updatedAt: string
    questions?: ApiQuestion[]
}

type ApiQuestion = {
    id: string
    content: string
    options: string[]
    correctIdx: number
    explanation?: string | null
}

export type ExamIdentifier =
    | {
          id: string
      }
    | {
          code: string
      }

export type QuestionInput = Omit<Question, "id"> & { id?: string }

export interface CreateExamPayload {
    code: string
    title: string
    authorId?: string
    status?: ExamStatus
    durationMinutes?: number | null
    questions?: QuestionInput[]
}

export interface UpdateExamPayload {
    title?: string
    status?: ExamStatus
    code?: string
    durationMinutes?: number | null
    questions?: QuestionInput[]
}

function unwrap<T>(payload: ApiEnvelope<T>): T {
    if (!payload.success || payload.data === undefined || payload.data === null) {
        throw new Error(payload.error || "Unexpected API response.")
    }

    return payload.data
}

function mapQuestion(question: ApiQuestion): Question {
    return {
        id: question.id,
        content: question.content,
        options: Array.isArray(question.options)
            ? question.options.map((option) => option.toString())
            : [],
        correctIdx: question.correctIdx,
        explanation: question.explanation ?? undefined,
    }
}

function mapExam(exam: ApiExam): Exam {
    return {
        id: exam.id,
        code: exam.code,
        title: exam.title,
        status: exam.status,
        durationMinutes: exam.durationMinutes ?? undefined,
        createdAt: exam.createdAt,
        questions: Array.isArray(exam.questions) ? exam.questions.map(mapQuestion) : [],
    }
}

function examUrl(identifier: ExamIdentifier) {
    if ("id" in identifier) {
        return `/exams/${encodeURIComponent(identifier.id)}`
    }
    return `/exams/${encodeURIComponent(identifier.code)}`
}

export async function listExams(status?: ExamStatus): Promise<Exam[]> {
    const response = await apiClient.get<ApiEnvelope<ApiExam[]>>("/exams", {
        params: status ? { status } : undefined,
    })

    return unwrap(response.data).map(mapExam)
}

export async function getExamById(id: string): Promise<Exam> {
    const response = await apiClient.get<ApiEnvelope<ApiExam>>(examUrl({ id }))
    return mapExam(unwrap(response.data))
}

export async function getExamByCode(code: string): Promise<Exam> {
    const response = await apiClient.get<ApiEnvelope<ApiExam>>(examUrl({ code }))
    return mapExam(unwrap(response.data))
}

export async function createExam(payload: CreateExamPayload): Promise<Exam> {
    const response = await apiClient.post<ApiEnvelope<ApiExam>>("/exams", payload)
    return mapExam(unwrap(response.data))
}

export async function updateExamMeta(
    identifier: ExamIdentifier,
    payload: Omit<UpdateExamPayload, "questions">
): Promise<Exam> {
    const response = await apiClient.patch<ApiEnvelope<ApiExam>>(examUrl(identifier), payload)
    return mapExam(unwrap(response.data))
}

export async function syncExamQuestions(
    identifier: ExamIdentifier,
    questions: QuestionInput[]
): Promise<Exam> {
    const response = await apiClient.patch<ApiEnvelope<ApiExam>>(examUrl(identifier), {
        questions,
    })

    return mapExam(unwrap(response.data))
}

export async function updateExam(
    identifier: ExamIdentifier,
    payload: UpdateExamPayload
): Promise<Exam> {
    const response = await apiClient.patch<ApiEnvelope<ApiExam>>(examUrl(identifier), payload)
    return mapExam(unwrap(response.data))
}

export async function deleteExam(identifier: ExamIdentifier): Promise<void> {
    await apiClient.delete<ApiEnvelope<unknown>>(examUrl(identifier))
}

