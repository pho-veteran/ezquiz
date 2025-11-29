# Exam Generation Prompt Architecture

This document provides a comprehensive breakdown of the prompt system used in `app/api/generate-exam/route.ts` for generating exam questions from documents using AI.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Input Parameters](#input-parameters)
3. [Prompt Structure](#prompt-structure)
4. [Static Template Sections](#static-template-sections)
5. [Conditional Sections](#conditional-sections)
6. [Output Schema](#output-schema)
7. [Flow Diagram](#flow-diagram)

---

## 🎯 Overview

The prompt system generates multiple-choice questions (MCQs) from uploaded documents using Google's Gemini AI. It uses a **chunking strategy** to generate questions in batches of 10 (configurable via `CHUNK_SIZE`).

### Key Features:
- **Chunking**: Questions generated in batches to handle large requests
- **Language Consistency**: Maintains language across all chunks
- **Topic Diversity**: Avoids repetition by tracking previous questions
- **Flexible Options**: Supports practical/theoretical ratio, difficulty distribution, language preference, and explanation style
- **Structured Output**: Uses JSON schema validation for reliable parsing

---

## 📥 Input Parameters

### Function Signature
```typescript
buildChunkPrompt(
    questionsNeeded: number,        // Questions to generate in this chunk
    previousSummary: string,         // Summary of previously generated questions
    customInstruction?: string,      // User-provided custom instructions
    languageSample?: string,         // Sample text from first question (for consistency)
    numQuestions?: number,           // Total questions requested
    options?: ExamOptions            // Exam configuration options
): string
```

### ExamOptions Interface
```typescript
interface ExamOptions {
    practicalRatio?: number | null;              // 0-100, null = auto
    difficultyDistribution?: {                   // Percentage distribution
        easy: number;
        medium: number;
        hard: number;
    } | null;
    language?: "auto" | "vi" | "en";            // Language preference
    explanationStyle?: "auto" | "detailed" | "concise";  // Explanation style
}
```

### Derived Variables
```typescript
const isLowQuestionCount = numQuestions !== undefined && numQuestions <= 20
const practicalRatio = options?.practicalRatio
const isTheoreticalOnly = practicalRatio === 0
```

---

## 🏗️ Prompt Structure

The prompt follows a structured format with the following sections:

```
1. Role
2. Goal / Task
3. Context / Background
4. Constraints & Requirements
   ├── Schema Compliance
   ├── Question Quality Requirements
   ├── LaTeX/Math Formatting Requirements
   ├── Language & Style Requirements (CONDITIONAL)
   ├── Topic Coverage Requirements (CONDITIONAL)
   ├── Difficulty Distribution Requirements (CONDITIONAL)
   ├── Language Preference (CONDITIONAL)
   ├── Explanation Style Requirements (CONDITIONAL)
   └── Custom Instructions (CONDITIONAL)
5. Process / Steps
6. Output Format
7. Forbidden Behaviors
8. Edge-Case Handling
9. Final Instruction
```

---

## 📝 Static Template Sections

These sections are **always included** in the prompt and do not change based on conditions.

### 1. Role
```
# Role
You are an expert educational assessment creator specializing in generating 
high-quality multiple-choice questions (MCQs) from source documents.
```

### 2. Goal / Task
```
# Goal / Task
Generate exactly {questionsNeeded} new, non-overlapping multiple-choice questions 
based exclusively on the provided document. Each question must be answerable 
using only information from the document.
```

### 3. Context / Background
**Conditional content:**
- If `previousSummary` exists and is not "No questions generated yet.":
  ```
  Previously generated questions (avoid repeating these topics):
  {previousSummary}
  ```
- Otherwise:
  ```
  This is the first batch of questions.
  ```

### 4. Schema Compliance (MANDATORY)
```
## Schema Compliance (MANDATORY - Highest Priority)
- Return ONLY a JSON array matching the exact schema structure
- Each question object MUST contain:
  - `content`: string (the question text)
  - `options`: array of exactly 4 strings (answer choices)
  - `correctIdx`: integer in range [0, 3]
  - `explanation`: string (explanation of the correct answer)
  - `difficulty`: optional string, one of: "Easy", "Medium", "Hard"
- Do NOT include any text, markdown, or prose outside the JSON array
- Do NOT include code blocks, explanations, or metadata
```

### 5. Question Quality Requirements
```
## Question Quality Requirements
- Question content: 15-150 words per question
- Explanation: 20-100 words, must directly reference specific information from the document
- All 4 options must be:
  - Grammatically correct and complete sentences/phrases
  - Plausible (reasonable but incorrect options should seem credible)
  - Mutually exclusive (no overlap in meaning)
  - Similar in length and complexity (±30% variation)
- Correct answer must be unambiguously supported by the document
- Incorrect options (distractors) must be factually incorrect or irrelevant, 
  not just "none of the above"
```

### 6. LaTeX/Math Formatting Requirements
```
## LaTeX/Math Formatting Requirements (CRITICAL)
- **ALWAYS wrap mathematical expressions with double dollar signs**: 
  Use `$$expression$$` for EVERY equation or symbol
- **Plain text MUST stay outside the math fences**
- **Common LaTeX patterns** (all inside `$$ ... $$`):
  - Fractions: `$\frac{numerator}{denominator}$`
  - Superscripts: `$x^2$`, `$a^{n+1}$`
  - Subscripts: `$x_1$`, `$a_{i,j}$`
  - Greek letters: `$\alpha$`, `$\beta$`, `$\pi$`, `$\theta$`
  - Operators: `$\sum$`, `$\prod$`, `$\int$`, `$\sqrt{x}$`
  - Relations: `$\leq$`, `$\geq$`, `$\neq$`, `$\approx$`
  - Sets: `$\in$`, `$\subset$`, `$\cup$`, `$\cap$`
- **CRITICAL RULES**:
  - Escape backslashes properly: Use `\\` for a single backslash
  - Do NOT use Unicode math symbols (×, ÷, ≤, ≥) - ALWAYS use LaTeX equivalents
  - DO NOT use inline math (`$...$`) anywhere—only `$$...$$` is allowed
```

### 7. Process / Steps
```
# Process / Steps

Follow this process for each question:

1. **Identify Topic**: Select a distinct concept, fact, or relationship from the document
2. **Verify Answerability**: Confirm the document contains sufficient information
3. **Formulate Question**: Write a clear, unambiguous question stem
4. **Determine Correct Answer**: Identify the single correct answer
5. **Create Distractors**: Generate 3 incorrect options
6. **Assign correctIdx**: Set correctIdx to 0, 1, 2, or 3
7. **Write Explanation**: Explain why the correct answer is right
8. **Assess Difficulty**: Label "Easy", "Medium", or "Hard" (or omit if unclear)
9. **Validate**: Ensure the question meets all schema and quality requirements
```

### 8. Output Format
```
# Output Format

Return ONLY a valid JSON array. No markdown, no code blocks, no explanations outside the array.

Example structure:
[
  {
    "content": "What is the primary purpose of X?",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctIdx": 1,
    "explanation": "X serves to... [specific reference from document]",
    "difficulty": "Medium"
  },
  ...
]
```

### 9. Forbidden Behaviors
```
# Forbidden Behaviors

DO NOT:
- Include questions not answerable from the document
- Use external knowledge or assumptions beyond the document
- Repeat topics from previous questions
- Create questions with fewer or more than 4 options
- Use correctIdx values outside [0, 3]
- Include markdown formatting, code blocks, or prose outside JSON
- Generate questions about trivial or peripheral details
- Create "trick" questions that mislead through ambiguous wording
- Use "All of the above" or "None of the above" as options
- Include phrases like "According to the document" in question content
- Switch languages between batches
```

---

## 🔀 Conditional Sections

These sections are **dynamically included** based on input parameters and conditions.

### 1. Language & Style Requirements

**Priority Hierarchy:**
1. `options.language` (if set and not "auto")
2. `languageSample` (from previous questions)
3. `customInstruction` (language detection from instructions)
4. Document language (default)

#### Condition A: Explicit Language Option
**Trigger:** `options?.language && options.language !== "auto"`

```
## Language & Style Requirements (CRITICAL - Consistency Required)
- **REQUIRED LANGUAGE (From Options)**: Generate ALL questions in {langName}. 
  This is the highest priority and overrides all other language detection.
- **CRITICAL**: Use this language consistently across ALL questions in ALL batches. 
  Do NOT switch languages.
```

#### Condition B: Language Sample Available
**Trigger:** `languageSample` exists (from previous questions)

```
## Language & Style Requirements (CRITICAL - Consistency Required)
- **MANDATORY LANGUAGE CONSISTENCY**: The following is a sample from previously 
  generated questions. You MUST generate ALL new questions in the EXACT SAME 
  language, script, and writing style as this sample:

Sample from previous questions:
"{languageSample}"

Analyze the language, script, terminology, and style used in this sample, and 
replicate it precisely in all new questions. Do NOT switch languages, scripts, or styles.
```

#### Condition C: Custom Instruction Available
**Trigger:** `customInstruction && customInstruction.trim()`

```
## Language & Style Requirements (CRITICAL - Consistency Required)
- **LANGUAGE DETECTION HIERARCHY**:
  1. **FIRST PRIORITY**: Analyze the custom instructions provided below. 
     Detect the language used in the custom instructions and use that language 
     for ALL questions.
  2. **SECOND PRIORITY**: If the custom instructions don't clearly indicate a 
     language, analyze and match the document's primary language exactly.
- **CRITICAL**: Once you determine the target language from custom instructions 
  or document, you MUST use the SAME language for ALL questions in ALL batches.
- **FLEXIBILITY**: The language can be any language (not limited to English or 
  Vietnamese). Detect and use whatever language is present in the custom 
  instructions or document.
```

#### Condition D: Default (Document Language)
**Trigger:** None of the above conditions met

```
## Language & Style Requirements (CRITICAL - Consistency Required)
- **LANGUAGE DETECTION**: Analyze the document's language, script, and writing 
  style. Match it exactly.
- **CRITICAL**: Once you determine the target language from the document, you 
  MUST use the SAME language, script, and style for ALL questions in ALL batches.
- **FLEXIBILITY**: The language can be any language (not limited to English or 
  Vietnamese). Detect and use whatever language is present in the document.
```

#### Additional Language Consistency Check
**Trigger:** `previousSummary` exists AND `!languageSample` AND (`!options?.language || options.language === "auto"`)

```
- **LANGUAGE CONSISTENCY CHECK**: Review the previously generated questions above. 
  You MUST generate new questions in the EXACT SAME language, script, and style 
  as those previous questions.
```

### 2. Topic Coverage Requirements

#### Condition A: Practical Ratio = 0 (Theoretical Only)
**Trigger:** `practicalRatio === 0`

```
## Topic Coverage Requirements
- Avoid repeating topics from previously generated questions
- Distribute questions across different sections/concepts in the document
- **THEORETICAL FOCUS (100%)**: Generate ONLY theoretical questions about 
  concepts, definitions, principles, and abstract knowledge. Avoid practical 
  applications or exercises.
```

#### Condition B: Practical Ratio = 100 (Practical Only)
**Trigger:** `practicalRatio === 100`

```
## Topic Coverage Requirements
- Avoid repeating topics from previously generated questions
- Distribute questions across different sections/concepts in the document
- **PRACTICAL FOCUS (100%)**: Generate ONLY practical questions that follow 
  exercises/examples from the document. Focus on problem-solving, calculations, 
  and applications. Before generating questions, analyze the uploaded document to identify:
  - Exercise sections and their formats
  - Example problem types and structures
  - Answer explanation patterns
  - Practical question styles (e.g., "Calculate...", "Solve...", "Apply...", "Determine...")
  - Then strictly follow these patterns when generating questions
```

#### Condition C: Practical Ratio = 1-99 (Mixed)
**Trigger:** `practicalRatio !== null && practicalRatio !== undefined && practicalRatio > 0 && practicalRatio < 100`

```
## Topic Coverage Requirements
- Avoid repeating topics from previously generated questions
- Distribute questions across different sections/concepts in the document
- **PRACTICAL/THEORETICAL RATIO**: Generate approximately {practicalRatio}% 
  practical questions and {theoreticalRatio}% theoretical questions.
  - Practical questions ({practicalRatio}%): Follow exercises/examples from the 
    document, focus on problem-solving, calculations, and applications
  - Theoretical questions ({theoreticalRatio}%): Focus on concepts, definitions, 
    principles, and abstract knowledge
  - Analyze the document to identify practical exercise patterns and theoretical 
    content sections
```

#### Condition D: Low Question Count (≤20)
**Trigger:** `isLowQuestionCount && practicalRatio === null || practicalRatio === undefined`

```
## Topic Coverage Requirements
- Avoid repeating topics from previously generated questions
- Distribute questions across different sections/concepts in the document
- **PRACTICAL QUESTION PRIORITY**: Since the requested number of questions 
  ({numQuestions}) is relatively low, you MUST prioritize practical questions that:
  1. Follow the format, style, and structure of exercises/examples found in the 
     uploaded document
  2. Replicate the type of practical questions present in the document
  3. Match the explanation style and answer format used in the document's 
     practical sections
  4. Cover ALL practical aspects related to the topic/context from the document
  5. Only generate theoretical questions if explicitly requested in custom 
     instructions or if the document contains no practical content
- **PRACTICAL QUESTION ANALYSIS**: Before generating questions, analyze the 
  uploaded document to identify:
  - Exercise sections and their formats
  - Example problem types and structures
  - Answer explanation patterns
  - Practical question styles
  - Then strictly follow these patterns when generating questions
- **COVERAGE GUARANTEE**: Ensure generated practical questions cover all 
  practical aspects of the topic/context.
```

#### Condition E: Default (Balanced)
**Trigger:** None of the above conditions met

```
## Topic Coverage Requirements
- Avoid repeating topics from previously generated questions
- Distribute questions across different sections/concepts in the document
- Prioritize:
  1. Core concepts and definitions
  2. Relationships and cause-effect patterns
  3. Application and analysis-level understanding
  4. Specific facts, figures, or examples (when significant)
- Balance between theoretical understanding and practical application
- Avoid trivial details or peripheral information
```

### 3. Difficulty Distribution Requirements
**Trigger:** `options?.difficultyDistribution` exists

```
## Difficulty Distribution Requirements
You MUST distribute questions according to the following difficulty percentages:
- Easy: {options.difficultyDistribution.easy}%
- Medium: {options.difficultyDistribution.medium}%
- Hard: {options.difficultyDistribution.hard}%

Ensure the difficulty labels match this distribution across all generated questions.
```

### 4. Language Preference (Duplicate Section)
**Trigger:** `options?.language && options.language !== "auto"`

**Note:** This is a duplicate/emphasis section that appears separately from the main Language & Style Requirements.

```
## Language Preference
- **REQUIRED LANGUAGE**: Generate ALL questions in {language}.
- Do NOT switch languages or mix languages.
- Use appropriate terminology and grammar for {language}.
```

### 5. Explanation Style Requirements
**Trigger:** `options?.explanationStyle && options.explanationStyle !== "auto"`

```
## Explanation Style Requirements
- **Explanation Style**: {style}
  - If "detailed": Provide comprehensive explanations (50-150 words) with 
    step-by-step reasoning, examples, and context.
  - If "concise": Provide brief, focused explanations (20-50 words) that 
    directly address why the answer is correct.
```

### 6. Custom Instructions
**Trigger:** `customInstruction && customInstruction.trim()`

```
## Custom Instructions (If Provided)
=== USER-SPECIFIC REQUIREMENTS ===
{customInstruction.trim()}

Apply these requirements while maintaining all schema and quality constraints above.
```

### 7. Edge-Case Handling (Language Section)
**Trigger:** Dynamic based on available language context

```
# Edge-Case Handling
- If document is unclear or ambiguous on a topic, skip that topic
- If document lacks sufficient content for {questionsNeeded} distinct questions, 
  generate the maximum possible distinct questions
- If language cannot be determined: 
  {languageSample ? "use the language from the sample provided above (already established)" 
   : customInstruction && customInstruction.trim() 
     ? "analyze and use the language of the custom instructions" 
     : "analyze and use the document's language"}
- If difficulty cannot be clearly assessed, omit the difficulty field
- **LANGUAGE CONSISTENCY**: 
  {languageSample 
    ? "You MUST replicate the exact language, script, and style from the sample provided above. This is non-negotiable." 
    : "Once you determine the language from custom instructions or document, maintain it consistently across ALL batches. Analyze linguistic features (script, vocabulary, grammar patterns) and replicate them precisely."}
```

---

## 📤 Output Schema

The AI is configured to return structured JSON matching this schema:

```typescript
type GeneratedQuestion = {
    content: string;           // Question text (15-150 words)
    options: string[];          // Exactly 4 answer choices
    correctIdx: number;         // 0-3 (index of correct answer)
    explanation: string;        // Explanation (20-100 words, or 50-150 if detailed)
    difficulty?: "Easy" | "Medium" | "Hard";  // Optional
}
```

### Validation
- Response is validated using `AIResponseSchema` (Zod schema)
- `correctIdx` values are clamped to [0, 3] if out of range
- Questions are sliced to match `questionsThisChunk` count

---

## 🔄 Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Exam Generation Flow                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Parse Request & Validate Inputs     │
        │  - file, title, numQuestions         │
        │  - examOptions (practicalRatio,     │
        │    difficultyDistribution, language, │
        │    explanationStyle)                 │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Prepare Document Source            │
        │  - Upload to Gemini (PDF/Image)     │
        │  - OR Extract text (TXT)            │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Calculate Chunks                    │
        │  totalChunks = ceil(numQuestions/10)│
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  FOR EACH CHUNK:                    │
        │  ┌───────────────────────────────┐  │
        │  │ 1. Calculate questionsThisChunk│  │
        │  │ 2. Build previousSummary       │  │
        │  │ 3. Build languageSample        │  │
        │  │ 4. Build chunkPrompt           │  │
        │  │    ├─ Static sections          │  │
        │  │    ├─ Language section         │  │
        │  │    │  (conditional)            │  │
        │  │    ├─ Topic coverage           │  │
        │  │    │  (conditional)            │  │
        │  │    ├─ Difficulty distribution  │  │
        │  │    │  (conditional)            │  │
        │  │    ├─ Explanation style        │  │
        │  │    │  (conditional)            │  │
        │  │    └─ Custom instructions      │  │
        │  │       (conditional)            │  │
        │  │ 5. Build contents (prompt +    │  │
        │  │    document)                   │  │
        │  │ 6. Call Gemini API             │  │
        │  │ 7. Parse & validate response   │  │
        │  │ 8. Add to aggregatedQuestions  │  │
        │  └───────────────────────────────┘  │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Validate Total Questions           │
        │  Ensure aggregatedQuestions.length  │
        │  >= numQuestions                    │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Save to Database                   │
        │  - Generate unique exam code        │
        │  - Create exam with questions      │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │  Return Success Response             │
        │  { success, examId, examCode,        │
        │    questionsCount }                 │
        └─────────────────────────────────────┘
```

---

## 🎨 Visual Prompt Structure

```
┌──────────────────────────────────────────────────────────────┐
│                        PROMPT STRUCTURE                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 1. ROLE                                                       │
│    └─ Static: Expert assessment creator                      │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 2. GOAL / TASK                                               │
│    └─ Dynamic: Generate {questionsNeeded} questions          │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 3. CONTEXT / BACKGROUND                                       │
│    ├─ IF previousSummary exists: Show previous questions     │
│    └─ ELSE: "This is the first batch"                        │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 4. CONSTRAINTS & REQUIREMENTS                                 │
│    ├─ Schema Compliance (STATIC)                            │
│    ├─ Question Quality (STATIC)                             │
│    ├─ LaTeX/Math Formatting (STATIC)                        │
│    ├─ Language & Style (CONDITIONAL) ────────┐             │
│    │   ├─ Option A: Explicit language option  │             │
│    │   ├─ Option B: Language sample           │             │
│    │   ├─ Option C: Custom instruction        │             │
│    │   └─ Option D: Document language         │             │
│    ├─ Topic Coverage (CONDITIONAL) ───────────┼───┐         │
│    │   ├─ Option A: Theoretical only (0%)     │   │         │
│    │   ├─ Option B: Practical only (100%)    │   │         │
│    │   ├─ Option C: Mixed ratio (1-99%)      │   │         │
│    │   ├─ Option D: Low count priority       │   │         │
│    │   └─ Option E: Balanced (default)       │   │         │
│    ├─ Difficulty Distribution (CONDITIONAL) ─┘   │         │
│    │   └─ IF options.difficultyDistribution   │   │         │
│    ├─ Language Preference (CONDITIONAL) ────────┘   │         │
│    │   └─ IF options.language !== "auto"      │             │
│    ├─ Explanation Style (CONDITIONAL) ────────────┘         │
│    │   └─ IF options.explanationStyle !== "auto"            │
│    └─ Custom Instructions (CONDITIONAL)                      │
│       └─ IF customInstruction exists                         │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 5. PROCESS / STEPS                                           │
│    └─ Static: 9-step question generation process            │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 6. OUTPUT FORMAT                                             │
│    └─ Static: JSON array example                             │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 7. FORBIDDEN BEHAVIORS                                       │
│    └─ Static: List of prohibited actions                     │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 8. EDGE-CASE HANDLING                                        │
│    ├─ Static: General edge cases                             │
│    └─ Dynamic: Language consistency message                  │
└──────────────────────────────────────────────────────────────┘
                              │
┌──────────────────────────────────────────────────────────────┐
│ 9. FINAL INSTRUCTION                                         │
│    └─ Dynamic: Generate exactly {questionsNeeded} questions │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔍 Key Design Decisions

### 1. **Chunking Strategy**
- **Why:** Large question sets (e.g., 150 questions) would exceed token limits and reduce quality
- **How:** Generate in batches of 10 questions per chunk
- **Benefit:** Better quality, manageable token usage, allows for progressive refinement

### 2. **Language Consistency**
- **Why:** Prevent language switching between chunks
- **How:** 
  - Extract language sample from first question
  - Pass sample to subsequent chunks
  - Priority hierarchy ensures consistent language selection
- **Benefit:** Coherent exam experience

### 3. **Topic Diversity**
- **Why:** Avoid repetitive questions
- **How:** 
  - Track last 5 questions in `previousSummary`
  - Include summary in each chunk prompt
  - Explicit instruction to avoid repeating topics
- **Benefit:** Better coverage of document content

### 4. **Conditional Sections**
- **Why:** Avoid overwhelming the model with irrelevant instructions
- **How:** Only include sections when relevant options are provided
- **Benefit:** Cleaner prompts, better focus, reduced token usage

### 5. **Structured Output**
- **Why:** Reliable parsing and validation
- **How:** 
  - JSON schema enforcement via Gemini API
  - Zod validation after parsing
  - Automatic correction of out-of-range values
- **Benefit:** Robust error handling and data integrity

---

## 📊 Example Scenarios

### Scenario 1: Basic Generation (No Options)
**Input:**
- `numQuestions = 10`
- `questionsNeeded = 10`
- `options = {}`
- `customInstruction = undefined`
- `languageSample = undefined`

**Result:**
- Single chunk (10 questions)
- Language detected from document
- Balanced topic coverage (default)
- No difficulty distribution
- Standard explanation style

### Scenario 2: Large Exam with Options
**Input:**
- `numQuestions = 50`
- `questionsNeeded = 10` (per chunk)
- `options = { practicalRatio: 70, language: "vi", explanationStyle: "detailed" }`
- `customInstruction = "Focus on calculus problems"`
- `languageSample = undefined` (first chunk)

**Result:**
- 5 chunks (10 questions each)
- Vietnamese language (explicit)
- 70% practical, 30% theoretical
- Detailed explanations (50-150 words)
- Custom instruction applied
- Language sample passed to chunks 2-5

### Scenario 3: Low Question Count
**Input:**
- `numQuestions = 15`
- `questionsNeeded = 10` (chunk 1), `5` (chunk 2)
- `options = {}`
- `isLowQuestionCount = true`

**Result:**
- 2 chunks
- Practical question priority (automatic)
- Emphasis on exercise-style questions
- Full coverage of practical aspects

---

## 🛠️ Helper Functions

### `buildPreviousSummary(questions: GeneratedQuestion[]): string`
- Extracts last 5 questions
- Truncates content to 160 characters
- Formats as numbered list
- Returns "No questions generated yet." if empty

### `buildLanguageSample(questions: GeneratedQuestion[]): string | undefined`
- Extracts first 100 chars of first question content
- Adds first 50 chars of first option
- Returns `undefined` if no questions exist
- Used for language consistency across chunks

### `buildContents(source: DocumentSource, prompt: string)`
- **Text source:** Appends document content to prompt (max 20,000 chars)
- **File source:** Sends file URI + prompt separately
- Returns formatted content array for Gemini API

---

## 📝 Notes

- **Token Limits:** Document content is truncated to 20,000 characters for text sources
- **Validation:** All responses are validated against `AIResponseSchema` (Zod)
- **Error Handling:** Out-of-range `correctIdx` values are automatically clamped
- **Uniqueness:** Exam codes are generated and checked for uniqueness before saving
- **Transaction Safety:** Exam and questions are created in a single database transaction

---

## 🔄 Future Enhancements

Potential improvements to consider:
1. **Dynamic Chunk Size:** Adjust based on document complexity
2. **Question Templates:** Support for different question types (true/false, fill-in-the-blank)
3. **Multi-document Support:** Generate questions from multiple sources
4. **Question Difficulty Auto-calibration:** Use AI to assess and adjust difficulty
5. **Topic Clustering:** Ensure questions cover all major topics evenly
6. **Feedback Loop:** Learn from user edits to improve future generations

---

**Last Updated:** Generated from `app/api/generate-exam/route.ts`
**Version:** 1.0

