export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // 0-3 index
    explanation?: string; // Optional explanation for the correct answer
}

export interface Exam {
    id: string;
    code: string;
    title: string;
    createdAt: string; // ISO String
    status: "draft" | "published";
    questions: Question[];
}
