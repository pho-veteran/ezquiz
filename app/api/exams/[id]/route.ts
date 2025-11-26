import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/exams/[id]
 * Get a specific exam by ID with its questions
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const exam = await prisma.exam.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: {
                        createdAt: "asc",
                    },
                },
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!exam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: exam,
        });
    } catch (error) {
        console.error("Error fetching exam:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch exam",
            },
            { status: 500 }
        );
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
        const { id } = await params;
        const body = await request.json();
        const { title, status, code } = body;

        // Check if exam exists
        const existingExam = await prisma.exam.findUnique({
            where: { id },
        });

        if (!existingExam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            );
        }

        // If updating code, check for uniqueness
        if (code && code !== existingExam.code) {
            const codeExists = await prisma.exam.findUnique({
                where: { code },
            });

            if (codeExists) {
                return NextResponse.json(
                    {
                        success: false,
                        error: "Exam code already exists",
                    },
                    { status: 409 }
                );
            }
        }

        // Update exam
        const updatedExam = await prisma.exam.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(status && { status }),
                ...(code && { code }),
            },
            include: {
                questions: true,
                author: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: updatedExam,
        });
    } catch (error) {
        console.error("Error updating exam:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to update exam",
            },
            { status: 500 }
        );
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
        const { id } = await params;

        // Check if exam exists
        const exam = await prisma.exam.findUnique({
            where: { id },
        });

        if (!exam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam not found",
                },
                { status: 404 }
            );
        }

        // Delete exam (questions will be deleted automatically due to cascade)
        await prisma.exam.delete({
            where: { id },
        });

        return NextResponse.json({
            success: true,
            message: "Exam deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting exam:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to delete exam",
            },
            { status: 500 }
        );
    }
}
