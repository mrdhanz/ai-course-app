import { NextResponse } from "next/server";
import gemini from "@/lib/gemini";
import { SchemaType } from "@google/generative-ai";
import { Course } from "@/types/course";

interface GenerateCourseRequest {
  courseTitle: string;
  verifiedBy: string;
  totalDuration: number;
  level: string;
  lang: string;
  keyTopics?: string[];
  targetAudience?: string;
  prerequisites?: string[];
  suggestions?: boolean;
}

export async function POST(request: Request) {
  try {
    const requestData: GenerateCourseRequest = await request.json();

    // Validate required fields
    if (
      !requestData.level ||
      !requestData.courseTitle ||
      !requestData.lang ||
      !requestData.verifiedBy ||
      !requestData.totalDuration
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    const ai = gemini.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      systemInstruction: "You are an Expert Course Creator",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            language: { type: SchemaType.STRING },
            difficultyLevel: {
              type: SchemaType.STRING,
              enum: ["beginner", "intermediate", "advanced"],
              format: "enum",
            },
            verifiedBy: { type: SchemaType.STRING },
            totalDuration: { type: SchemaType.NUMBER },
            learningObjective: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            skillsGain: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
            },
            modules: {
              type: SchemaType.ARRAY,
              maxItems: 20,
              minItems: 3,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  durationHours: { type: SchemaType.NUMBER },
                  lessons: {
                    type: SchemaType.ARRAY,
                    maxItems: 10,
                    minItems: 3,
                    items: { type: SchemaType.STRING },
                  },
                },
                required: ["title", "description", "durationHours", "lessons"],
              },
            },
          },
          required: [
            "title",
            "description",
            "language",
            "difficultyLevel",
            "verifiedBy",
            "totalDuration",
            "learningObjective",
            "skillsGain",
            "modules",
          ],
        },
      },
    });

    const aiResponse =
      await ai.generateContent(`Generate a comprehensive course outline ${requestData?.suggestions ? 'Strictly ': ''} about "${requestData.courseTitle}" for ${requestData.level}-level learners.  
                  ${requestData.targetAudience ? `${requestData?.suggestions ? 'Strictly ': ''}Target Audience: ${requestData.targetAudience}` : ``}
                  ${requestData.keyTopics ? `${requestData?.suggestions ? 'Strictly ': ''}Key Topics: ${requestData.keyTopics.join(', ')}` : ``}
                  ${requestData.prerequisites ? `${requestData?.suggestions ? 'Strictly ': ''}Prerequisites: ${requestData.prerequisites.join(', ')}` : ``}
                  strictly the course verified: ${requestData.verifiedBy}.
                  Total course duration: ${requestData.totalDuration} hours.
                  Language: ${requestData.lang}. 
                  Respond with JSON format containing:
                  - Course title${requestData?.suggestions ? '': ' (creative and engaging)'}
                  - Short description (2-3 sentences)
                  - Short learningObjective (2-3 sentences)
                  - Short skillsGain (1-5 word)
                  - 3-20 modules (each with title, short description, and estimated duration in hours)
                  - For each module, include min. 3 max. 10 lessons (title only)`);

    const response: Course = JSON.parse(aiResponse.response.text());
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
