import genAI from "@/lib/gemini";
import { CourseSuggestionsResponse } from "@/types/course-suggestion";
import { courseSuggestionSchema } from "@/validations/course-suggestion";
import { SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = courseSuggestionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { subject, audience, goals, language, verifiedBy } = validation.data;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      systemInstruction: 'You are an Expert Course Creator',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            suggestions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  targetAudience: { type: SchemaType.STRING },
                  keyTopics: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    minItems: 3,
                    maxItems: 10
                  },
                  durationWeeks: { 
                    type: SchemaType.NUMBER
                  },
                  difficulty: {
                    type: SchemaType.STRING,
                    enum: ["beginner", "intermediate", "advanced"],
                    format: 'enum'
                  },
                  prerequisites: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING }
                  },
                  verifiedBy: { type: SchemaType.STRING },
                },
                required: [
                  "title",
                  "description",
                  "targetAudience",
                  "keyTopics",
                  "durationWeeks",
                  "difficulty",
                  "verifiedBy",
                  "prerequisites"
                ]
              },
              minItems: 3,
              maxItems: 5
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const prompt = `
      Generate 3-5 comprehensive course suggestions for ${subject} aimed at ${audience}.
      ${goals ? `Learning goals: ${goals}` : ''}
      Language: ${language}
      ${verifiedBy ? `strictly the course verified by: ${verifiedBy}` : ''}
      
      Each suggestion should include:
      - Clear title
      - Detailed description
      - Target audience specifics
      - 5-8 key topics covered
      - Duration in weeks (1-12)
      - Difficulty level
      - Recommended prerequisites
      ${!verifiedBy ? '- Course verified related to the subject and difficulty level. ex: Coursera, Google Course, LinkedIn Learn, etc' : ''}
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse and validate the response
    const data: CourseSuggestionsResponse = JSON.parse(text);
    
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error generating course suggestions:", error);
    return NextResponse.json(
      { error: "Failed to generate course suggestions" },
      { status: 500 }
    );
  }
}