export interface Question {
    id: string;
    text: string;
    options: string[];
    correctAnswer: number; // 0-3 index
}

export interface Exam {
    id: string;
    code: string;
    title: string;
    createdAt: string; // ISO String
    status: "draft" | "published";
    questions: Question[];
}
