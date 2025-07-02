
import { GoogleGenAI } from "@google/genai";
import { Quiz } from '../types.ts';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * A robust JSON parser that cleans and extracts a JSON object or array from a raw string.
 * It handles common LLM-related issues like markdown fences, extraneous text, and trailing commas.
 * @param text The raw string, potentially containing a JSON object/array.
 * @returns A parsed JavaScript object or array, or null if parsing fails.
 */
const parseQuizBatchFromJson = (text: string | undefined | null): Quiz[] | null => {
    if (!text) {
        console.warn("Input to parseQuizBatchFromJson is empty.");
        return null;
    }

    let jsonStr = text.trim();

    // 1. Handle and extract content from markdown code fences (e.g., ```json ... ```)
    const fenceMatch = jsonStr.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/s);
    if (fenceMatch && fenceMatch[1]) {
        jsonStr = fenceMatch[1].trim();
    } 
    // 2. If no fence, aggressively find the main JSON block to remove extraneous text.
    else {
        const firstBracket = jsonStr.indexOf('[');
        const lastBracket = jsonStr.lastIndexOf(']');
        const firstBrace = jsonStr.indexOf('{');
        const lastBrace = jsonStr.lastIndexOf('}');

        if (firstBracket !== -1 && lastBracket > firstBracket) {
            jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
        } else if (firstBrace !== -1 && lastBrace > firstBrace) {
            jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
        }
    }

    // 3. Remove trailing commas, a common LLM formatting error.
    jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

    try {
        const parsedData = JSON.parse(jsonStr);
        
        const quizArray = Array.isArray(parsedData) ? parsedData : [parsedData];

        if (
            quizArray.length > 0 &&
            quizArray.every(item => 
                item &&
                typeof item.question === 'string' &&
                Array.isArray(item.options) &&
                item.options.length > 0 &&
                typeof item.answer === 'string'
            )
        ) {
            return quizArray as Quiz[];
        }
        
        console.warn("Parsed data does not conform to the expected Quiz[] structure:", { parsedData });
        return null;
    } catch (e) {
        console.error("Failed to parse JSON response:", e, {
            originalText: text,
            cleanedText: jsonStr,
        });
        return null;
    }
};


export const generateQuizBatchFromText = async (text: string, excludeQuestions: string[] = []): Promise<Quiz[] | null> => {
  const model = "gemini-2.5-flash-preview-04-17";
  
  const exclusionPrompt = excludeQuestions.length > 0
    ? `
---
IMPORTANT: To ensure a fresh experience, do NOT repeat any of the following questions. Generate completely new questions that are not on this list:
${excludeQuestions.map(q => `- "${q}"`).join('\n')}
---
`
    : '';

  const prompt = `
    Based *only* on the following text, generate a batch of 20 unique and challenging multiple-choice quiz questions.
    Each question must be relevant to the main topics of the text.
    For each question, provide 4 distinct options and clearly indicate the correct answer.
    ${exclusionPrompt}
    Return the output *only* as a single, valid JSON array of objects. Do not add any comments, markdown, or other text outside of the JSON array.

    Example format:
    [
      {
        "question": "This is an example question based on the text?",
        "options": ["Example Option A", "Example Option B", "Example Option C", "Example Option D"],
        "answer": "Example Option B"
      },
      {
        "question": "What is another example question?",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "answer": "Option 3"
      }
    ]

    ---
    TEXT CONTEXT:
    ${text.substring(0, 1000000)}
    ---
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 1,
        topP: 0.95,
        topK: 64
      }
    });

    const jsonText = response?.text;
    if (!jsonText) {
        console.error("API returned an empty response.");
        return null;
    }
    
    return parseQuizBatchFromJson(jsonText);
  } catch (error) {
    console.error("Error generating quiz from Gemini:", error);
    throw new Error("Could not generate quiz. The API might be unavailable or the request failed.");
  }
};


export const generateExplanationForMistake = async (
  question: string,
  userAnswer: string,
  correctAnswer: string,
  context: string
): Promise<string | null> => {
  const model = "gemini-2.5-flash-preview-04-17";
  const prompt = `
    A user took a quiz based on the provided text context. Please provide a concise, helpful explanation (2-3 sentences) for their mistake.

    Text Context: """${context.substring(0, 50000)}"""

    Question: "${question}"
    Their Incorrect Answer: "${userAnswer}"
    The Correct Answer: "${correctAnswer}"

    Explain why their answer is incorrect and why the correct answer is right, referencing the text context.
    Be encouraging and clear. Start the explanation directly, without any preamble.
  `;

  try {
     const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
       config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 64
      }
    });
    
    return response?.text?.trim() ?? null;
  } catch (error) {
    console.error("Error generating explanation from Gemini:", error);
    return null;
  }
};
