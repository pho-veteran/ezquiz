import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/exams
 * Get all exams with their questions
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status"); // Optional: filter by status

        const exams = await prisma.exam.findMany({
            where: status ? { status } : undefined,
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
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json({
            success: true,
            data: exams,
            count: exams.length,
        });
    } catch (error) {
        console.error("Error fetching exams:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch exams",
            },
            { status: 500 }
        );
    }
}

/**
 * POST /api/exams
 * Create a new exam with questions
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            code,
            title,
            status = "draft",
            authorId,
            questions = [],
        } = body;

        // Validate required fields
        if (!code || !title) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Code and title are required",
                },
                { status: 400 }
            );
        }

        // Check if exam code already exists
        const existingExam = await prisma.exam.findUnique({
            where: { code },
        });

        if (existingExam) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Exam code already exists",
                },
                { status: 409 }
            );
        }

        // Create exam with questions
        const exam = await prisma.exam.create({
            data: {
                code,
                title,
                status,
                ...(authorId && { authorId }),
                questions: {
                    create: questions.map(
                        (q: {
                            text: string;
                            options: string[];
                            correctAnswer: number;
                        }) => ({
                            text: q.text,
                            options: q.options,
                            correctAnswer: q.correctAnswer,
                        })
                    ),
                },
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

        return NextResponse.json(
            {
                success: true,
                data: exam,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating exam:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to create exam",
            },
            { status: 500 }
        );
    }
}
