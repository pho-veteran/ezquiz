import { z } from "zod";

/**
 * Schema for a single generated question from AI
 * Validates that each question has:
 * - content: The question text
 * - options: Exactly 4 answer choices
 * - correctIdx: The index (0-3) of the correct answer
 * - explanation: Why this answer is correct
 * - difficulty: Optional difficulty level
 */
export const GeneratedQuestionSchema = z.object({
  content: z.string().min(1, "Question content cannot be empty").describe("The multiple choice question text"),
  options: z.array(z.string().min(1, "Option cannot be empty")).length(4, "Must have exactly 4 options").describe("Array containing exactly 4 answer choices"),
  correctIdx: z.number().int().min(0).max(3).describe("Index (0-3) of the correct answer in the options array"),
  explanation: z.string().min(1, "Explanation cannot be empty").describe("Brief explanation of why this answer is correct"),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional().describe("Optional difficulty level of the question")
});

/**
 * Schema for the complete AI response
 * Expects an array of questions from the AI
 */
export const AIResponseSchema = z.array(GeneratedQuestionSchema).min(1, "Must generate at least 1 question");

/**
 * TypeScript types inferred from the Zod schemas
 * Use these for type-safe code throughout the application
 */
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export type AIResponse = z.infer<typeof AIResponseSchema>;



