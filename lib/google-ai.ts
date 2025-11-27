import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

/**
 * Initialize Google Generative AI client
 * Requires GOOGLE_AI_API_KEY environment variable
 */
const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
    throw new Error(
        "GOOGLE_AI_API_KEY is not defined in environment variables"
    );
}

export const genAI = new GoogleGenerativeAI(apiKey);
export const fileManager = new GoogleAIFileManager(apiKey);

/**
 * Supported file MIME types for upload to Gemini
 */
export const SUPPORTED_MIME_TYPES = {
    // Documents
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    // Audio
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/wav": ".wav",
    // Images
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
};

/**
 * Maximum file size allowed (20MB)
 */
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

/**
 * Validate file before upload
 * @param file - File object to validate
 * @returns true if valid, throws error otherwise
 */
export function validateFile(file: File): boolean {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        throw new Error(
            `File size exceeds maximum limit of ${
                MAX_FILE_SIZE / 1024 / 1024
            }MB. Please compress or reduce the file size.`
        );
    }

    // Check MIME type
    if (!Object.keys(SUPPORTED_MIME_TYPES).includes(file.type)) {
        throw new Error(
            `Unsupported file type: ${file.type}. Supported formats: PDF, MP3/MPEG/WAV audio, PNG/JPEG/WEBP images, or plain text (TXT)`
        );
    }

    return true;
}

/**
 * Upload file to Gemini File API and wait for it to be active
 * @param file - File to upload
 * @returns Object containing the file URI and MIME type
 */
export async function uploadFileToGemini(
    file: File
): Promise<{ uri: string; mimeType: string }> {
    try {
        // Validate file first
        validateFile(file);

        // Convert File to Buffer for upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload file to Gemini
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const uploadResult = await fileManager.uploadFile(buffer as any, {
            mimeType: file.type,
            displayName: file.name,
        });

        console.log(
            `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`
        );

        // Wait for file to be processed and become ACTIVE
        let uploadedFile = await fileManager.getFile(uploadResult.file.name);

        while (uploadedFile.state === "PROCESSING") {
            console.log("File is still processing, waiting...");
            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
            uploadedFile = await fileManager.getFile(uploadResult.file.name);
        }

        if (uploadedFile.state === "FAILED") {
            throw new Error(
                "File processing failed. Please try again with a different file."
            );
        }

        console.log(
            `File ${uploadedFile.displayName} is now ${uploadedFile.state}`
        );

        return {
            uri: uploadedFile.uri,
            mimeType: uploadedFile.mimeType,
        };
    } catch (error) {
        console.error("Error uploading file to Gemini:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(`Failed to upload file: ${errorMessage}`);
    }
}

/**
 * Extract text content from a text file
 * For TXT files, we can extract the text directly without using Gemini File API
 * @param file - Text file to extract content from
 * @returns The text content of the file
 */
export async function extractTextFromFile(file: File): Promise<string> {
    try {
        if (file.type !== "text/plain") {
            throw new Error(
                "extractTextFromFile only supports text/plain files"
            );
        }

        const text = await file.text();

        if (!text || text.trim().length === 0) {
            throw new Error("Text file is empty");
        }

        return text.trim();
    } catch (error) {
        console.error("Error extracting text from file:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error occurred";
        throw new Error(`Failed to extract text: ${errorMessage}`);
    }
}

/**
 * Get the appropriate Gemini model for generation
 * Using gemini-1.5-flash for fast and cost-effective generation
 */
export function getGenerativeModel() {
    return genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
    });
}
