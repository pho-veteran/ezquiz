import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { EXAM_STATUSES, normalizeExamStatus } from "@/lib/exam-status"
import { validateQuestionsPayload } from "@/lib/exam-validation"

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

const examInclude = {
    questions: {
        orderBy: {
            createdAt: "asc" as const,
        },
    },
    author: {
        select: {
            id: true,
            name: true,
            email: true,
        },
    },
}

type ExamIdentifier =
    | {
          field: "id"
          value: string
      }
    | {
          field: "code"
          value: string
      }

function isValidObjectId(value?: string | null): value is string {
    return typeof value === "string" && OBJECT_ID_REGEX.test(value)
}

function resolveExamIdentifier(request: NextRequest, paramsId?: string): ExamIdentifier | null {
    const trimmedParam = paramsId?.trim()
    const { searchParams } = new URL(request.url)
    const codeFromQuery = searchParams.get("code")?.trim()

    if (isValidObjectId(trimmedParam)) {
        return { field: "id", value: trimmedParam }
    }

    if (codeFromQuery) {
        return { field: "code", value: codeFromQuery }
    }

    if (trimmedParam) {
        return { field: "code", value: trimmedParam }
    }

    return null
}

function buildWhereClause(identifier: ExamIdentifier) {
    return identifier.field === "id" ? { id: identifier.value } : { code: identifier.value }
}

/**
 * GET /api/exams/[id]
 * Get a specific exam by ID with its questions
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const identifier = resolveExamIdentifier(request, id)

        if (!identifier) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam identifier is required.",
                },
                { status: 400 }
            )
        }

        const exam = await prisma.exam.findUnique({
            where: buildWhereClause(identifier),
            include: examInclude,
        })

        if (!exam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: exam,
        })
    } catch (error) {
        console.error("Error fetching exam:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch exam",
            },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/exams/[id]
 * Update an exam
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const identifier = resolveExamIdentifier(request, id)

        if (!identifier) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam identifier is required.",
                },
                { status: 400 }
            )
        }

        const existingExam = await prisma.exam.findUnique({
            where: buildWhereClause(identifier),
            include: {
                questions: {
                    select: { id: true },
                },
            },
        })

        if (!existingExam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            )
        }

        const body = await request.json()
        const { title, status, code, durationMinutes, questions } = body ?? {}

        const trimmedTitle =
            title === undefined ? undefined : typeof title === "string" ? title.trim() : ""
        const trimmedCode =
            code === undefined ? undefined : typeof code === "string" ? code.trim() : ""
        const normalizedStatus = status === undefined ? undefined : normalizeExamStatus(status)

        const errors: string[] = []

        if (trimmedTitle !== undefined && trimmedTitle.length === 0) {
            errors.push("Title cannot be empty.")
        }

        if (trimmedCode !== undefined && trimmedCode.length === 0) {
            errors.push("Code cannot be empty.")
        }

        if (status !== undefined && !normalizedStatus) {
            errors.push(`Invalid status. Accepted values: ${EXAM_STATUSES.join(", ")}.`)
        }

        const {
            questions: validatedQuestions,
            errors: questionErrors,
        } = validateQuestionsPayload(questions)

        if (questionErrors.length > 0) {
            errors.push(...questionErrors)
        }

        if (errors.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: errors.join(" "),
                },
                { status: 400 }
            )
        }

        if (trimmedCode && trimmedCode !== existingExam.code) {
            const codeExists = await prisma.exam.findUnique({
                where: { code: trimmedCode },
            })

            if (codeExists) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Exam code already exists",
                    },
                    { status: 409 }
                )
            }
        }

        const shouldSyncQuestions = Array.isArray(questions)

        const updatedExam = await prisma.$transaction(async (tx) => {
            if (
                trimmedTitle !== undefined ||
                trimmedCode !== undefined ||
                normalizedStatus !== undefined ||
                durationMinutes !== undefined
            ) {
                await tx.exam.update({
                    where: { id: existingExam.id },
            data: {
                        ...(trimmedTitle !== undefined && { title: trimmedTitle }),
                        ...(trimmedCode !== undefined && { code: trimmedCode }),
                        ...(normalizedStatus && { status: normalizedStatus }),
                        ...(durationMinutes !== undefined && {
                            durationMinutes:
                                durationMinutes === null || durationMinutes === ""
                                    ? null
                                    : typeof durationMinutes === "number" && durationMinutes > 0
                                      ? durationMinutes
                                      : null,
                        }),
            },
                })
            }

            if (shouldSyncQuestions) {
                const questionIdsToKeep = validatedQuestions
                    .map((question) => question.id)
                    .filter((questionId): questionId is string => Boolean(questionId))

                if (questionIdsToKeep.length > 0) {
                    await tx.question.deleteMany({
                        where: {
                            examId: existingExam.id,
                            id: {
                                notIn: questionIdsToKeep,
                            },
                        },
                    })
                } else {
                    await tx.question.deleteMany({
                        where: { examId: existingExam.id },
                    })
                }

                for (const question of validatedQuestions) {
                    if (question.id) {
                        const result = await tx.question.updateMany({
                            where: { id: question.id, examId: existingExam.id },
                            data: {
                                content: question.content,
                                options: question.options,
                                correctIdx: question.correctIdx,
                                explanation: question.explanation ?? "",
                            },
                        })

                        if (result.count === 0) {
                            throw new Error(`Question ${question.id} does not belong to this exam.`)
                        }
                    } else {
                        await tx.question.create({
                            data: {
                                content: question.content,
                                options: question.options,
                                correctIdx: question.correctIdx,
                                explanation: question.explanation ?? "",
                                examId: existingExam.id,
                            },
                        })
                    }
                }
            }

            return tx.exam.findUnique({
                where: { id: existingExam.id },
                include: examInclude,
            })
        })

        return NextResponse.json({
            success: true,
            data: updatedExam,
        })
    } catch (error) {
        console.error("Error updating exam:", error)
        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error ? error.message : "Failed to update exam. Please try again.",
            },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/exams/[id]
 * Delete an exam (cascades to questions)
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const identifier = resolveExamIdentifier(request, id)

        if (!identifier) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam identifier is required.",
                },
                { status: 400 }
            )
        }

        const exam = await prisma.exam.findUnique({
            where: buildWhereClause(identifier),
        })

        if (!exam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            )
        }

        await prisma.exam.delete({
            where: { id: exam.id },
        })

        return NextResponse.json({
            success: true,
            message: "Exam deleted successfully",
        })
    } catch (error) {
        console.error("Error deleting exam:", error)
        return NextResponse.json(
            {
                success: false,
                error: "Failed to delete exam",
            },
            { status: 500 }
        )
    }
}
