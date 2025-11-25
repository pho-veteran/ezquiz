import { Exam } from "@/types";

export const MOCK_EXAMS: Exam[] = [
    {
        id: "1",
        code: "MATH101",
        title: "Kiểm tra Toán 12 - Chương 1",
        createdAt: new Date().toISOString(),
        status: "published",
        questions: [
            {
                id: "q1",
                text: "Hàm số nào sau đây đồng biến trên R?",
                options: [
                    "y = x^3 + x",
                    "y = x^2 + 1",
                    "y = -x + 2",
                    "y = 1/x",
                ],
                correctAnswer: 0,
            },
            {
                id: "q2",
                text: "Nghiệm của phương trình 2^x = 8 là:",
                options: ["x = 2", "x = 3", "x = 4", "x = 1"],
                correctAnswer: 1,
            },
        ],
    },
    {
        id: "2",
        code: "ENG202",
        title: "English Vocabulary Quiz",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        status: "draft",
        questions: [],
    },
];
