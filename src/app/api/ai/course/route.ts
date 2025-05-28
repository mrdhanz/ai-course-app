import { NextResponse } from "next/server";
import gemini from "@/lib/gemini";
import { SchemaType } from "@google/generative-ai";
import { Course } from "@/types/course";

interface GenerateCourseRequest {
  courseTitle: string;
  verifiedBy: string;
  totalDuration: number;
  level: "beginner" | "intermediate" | "advanced"; // Use a union type for better validation
  lang: string;
  keyTopics?: string[];
  targetAudience?: string;
  prerequisites?: string[];
  suggestions?: boolean;
  // Added a field for desired number of modules for more control
  desiredModules?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x:string]: any;
}

export async function POST(request: Request) {
  try {
    const requestData: GenerateCourseRequest = await request.json();

    // --- Input Validation Enhancements ---
    // More specific error messages for missing fields
    const requiredFields = [
      "level",
      "courseTitle",
      "lang",
      "verifiedBy",
      "totalDuration",
    ];
    for (const field of requiredFields) {
      if (!requestData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate level to ensure it's one of the allowed values
    const allowedLevels = ["beginner", "intermediate", "advanced"];
    if (!allowedLevels.includes(requestData.level)) {
      return NextResponse.json(
        { error: "Invalid 'level' provided. Must be 'beginner', 'intermediate', or 'advanced'." },
        { status: 400 }
      );
    }

    // Validate totalDuration to be a positive number
    if (requestData.totalDuration <= 0) {
      return NextResponse.json(
        { error: "Total duration must be a positive number." },
        { status: 400 }
      );
    }

    // Validate desiredModules if provided
    if (requestData.desiredModules && (requestData.desiredModules < 3 || requestData.desiredModules > 20)) {
      return NextResponse.json(
        { error: "Desired modules must be between 3 and 20." },
        { status: 400 }
      );
    }
    // --- End Input Validation Enhancements ---

    const ai = gemini.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      systemInstruction: "You are an Expert Course Creator. Your task is to generate highly structured and comprehensive course outlines in JSON format, ensuring all specified constraints are met.",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { 
              type: SchemaType.STRING, 
              description: "Engaging and descriptive course title." 
            },
            description: { 
              type: SchemaType.STRING, 
              description: "A concise overview (2-3 sentences) of the course content." 
            },
            language: { type: SchemaType.STRING },
            difficultyLevel: {
              type: SchemaType.STRING,
              enum: ["beginner", "intermediate", "advanced"],
              format: "enum",
              description: "The target difficulty level for the course."
            },
            verifiedBy: { 
              type: SchemaType.STRING, 
              description: "The entity or individual verifying the course content." 
            },
            totalDuration: { 
              type: SchemaType.NUMBER, 
              description: "The total estimated duration of the course in hours." 
            },
            learningObjective: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "A list of key learning outcomes (2-3 sentences max each)."
            },
            skillsGain: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "A list of specific skills learners will acquire (1-5 words each)."
            },
            modules: {
              type: SchemaType.ARRAY,
              maxItems: 20, // Enforce max modules as per AI model's capability
              minItems: 3,  // Enforce min modules as per AI model's capability
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING, description: "Title of the module." },
                  description: { type: SchemaType.STRING, description: "A brief description of the module's content." },
                  durationHours: { type: SchemaType.NUMBER, description: "Estimated duration of the module in hours." },
                  lessons: {
                    type: SchemaType.ARRAY,
                    maxItems: 10,
                    minItems: 3,
                    items: { type: SchemaType.STRING, description: "Title of a lesson within the module." },
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

    // --- Dynamic Prompt Construction ---
    let prompt = `Generate a comprehensive course outline about "${requestData.courseTitle}" for ${requestData.level}-level learners.`;

    if (requestData.targetAudience) {
      prompt += ` Target Audience: ${requestData.targetAudience}.`;
    }
    if (requestData.keyTopics && requestData.keyTopics.length > 0) {
      prompt += ` Key Topics: ${requestData.keyTopics.join(", ")}.`;
    }
    if (requestData.prerequisites && requestData.prerequisites.length > 0) {
      prompt += ` Prerequisites: ${requestData.prerequisites.join(", ")}.`;
    }
    
    // Add instruction for desired number of modules
    if (requestData.desiredModules) {
      prompt += ` Strictly generate exactly ${requestData.desiredModules} modules.`;
    } else {
      prompt += ` Generate between 3 and 20 modules.`; // Default range
    }

    prompt += ` The course must be verified by: ${requestData.verifiedBy}.`;
    prompt += ` Total course duration: ${requestData.totalDuration} hours.`;
    prompt += ` Language: ${requestData.lang}.`;
    
    // Adjust prompt based on 'suggestions' flag for creativity
    if (!requestData.suggestions) {
      prompt += ` Ensure the course title is creative and engaging, and learning objectives/skills gained are succinct.`;
    }

    prompt += ` Respond strictly with JSON format as per the defined schema, including:
                - Course title
                - Short description (2-3 sentences)
                - Learning objectives (2-3 sentences each)
                - Skills gained (1-5 words each)
                - Modules (each with title, short description, estimated duration in hours, and min. 3 max. 10 lesson titles).`;

    const aiResponse = await ai.generateContent(prompt);
    
    // --- Error Handling for AI Response ---
    const responseText = aiResponse.response.text();
    if (!responseText) {
      console.error("AI returned an empty response.");
      return NextResponse.json(
        { error: "Failed to generate course content from AI." },
        { status: 500 }
      );
    }
    
    let response: Course;
    try {
      response = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("AI Raw Response:", responseText); // Log raw response for debugging
      return NextResponse.json(
        { error: "AI response was not valid JSON." },
        { status: 500 }
      );
    }
    // --- End Error Handling for AI Response ---

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating course:", error);
    // Differentiate between known errors (e.g., validation) and unexpected errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Internal server error: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected internal server error occurred." },
      { status: 500 }
    );
  }
}