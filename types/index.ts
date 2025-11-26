export interface Question {
    id: string;
    content: string;
    options: string[];
    correctIdx: number; // 0-3 index
    explanation?: string; // Optional explanation for the correct answer
}

export interface Exam {
    id: string;
    code: string;
    title: string;
    createdAt: string; // ISO String
    status: "DRAFT" | "PUBLISHED" | "ENDED";
    durationMinutes?: number | null; // Optional time limit in minutes
    questions: Question[];
}

export interface Submission {
    id: string;
    examId: string;
    userId: string;
    answers: Record<string, number>; // Map of questionId to selected answer index
    score?: number;
    timeSpent?: number; // Time spent in seconds
    submittedAt: string; // ISO String
    createdAt: string; // ISO String
}

// Re-export Zod-inferred types for AI validation
export type { GeneratedQuestion, AIResponse } from "@/lib/zod-schema";
