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
      systemInstruction: "You are an Expert Course Creator",
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
                    maxItems: 10,
                  },
                  durationWeeks: {
                    type: SchemaType.NUMBER,
                  },
                  difficulty: {
                    type: SchemaType.STRING,
                    enum: ["beginner", "intermediate", "advanced"],
                    format: "enum",
                  },
                  prerequisites: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
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
                  "prerequisites",
                ],
              },
              minItems: 3,
              maxItems: 5,
            },
          },
          required: ["suggestions"],
        },
      },
    });

    const prompt = `
      Generate 3-5 comprehensive course suggestions for ${subject} aimed at ${audience}.
      ${goals ? `Learning goals: ${goals}` : ""}
      Language: ${language}
      ${verifiedBy ? `strictly the course verified by: ${verifiedBy}` : ""}
      
      Each suggestion should include:
      - Clear title
      - Detailed description
      - Target audience specifics
      - 5-8 key topics covered
      - Duration in weeks (1-12)
      - Difficulty level
      - Recommended prerequisites
      ${!verifiedBy ? "- Course verified related to the subject and difficulty level. ex: Coursera, Google Course, LinkedIn Learn, etc" : ""}
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q"); // The user's input query
  let type = searchParams.get("type"); // e.g., "subject", "audience", "verifiedBy"
  try {
    if (!query) {
      return NextResponse.json(
        { message: 'Query parameter "q" is required.' },
        { status: 400 }
      );
    }

    let prompt: string;
    // Determine the prompt based on the 'type' parameter
    switch (type) {
      case "subject":
        prompt = `Given the search query "${query}", suggest up to 5 concise and distinct course subject titles. Return only a JSON array of strings.

        Examples:
        Query: "AI"
        Output: ["Artificial Intelligence Fundamentals", "Advanced AI Concepts", "Machine Learning in AI", "AI Ethics and Society", "Practical AI Applications"]
        
        Query: "web dev"
        Output: ["Introduction to Web Development", "Frontend Web Design", "Backend Web Services", "Full-Stack Development with React", "Responsive Web Design"]

        Query: "${query}"
        Output:`;
        break;
      case "audience":
        prompt = `Given the search query "${query}", suggest up to 5 concise and distinct target audience types for a course. Return only a JSON array of strings.

        Examples:
        Query: "students"
        Output: ["College Students", "High School Students", "Graduate Students", "Adult Learners", "K-12 Students"]

        Query: "prof"
        Output: ["IT Professionals", "Marketing Professionals", "Healthcare Professionals", "Finance Professionals", "Software Engineers"]

        Query: "${query}"
        Output:`;
        break;
      case "verifiedBy":
        prompt = `Given the search query "${query}", suggest up to 5 concise and distinct course verification platforms or providers. Return only a JSON array of strings.

        Examples:
        Query: "google"
        Output: ["Google Course", "Google Developers", "Google Cloud", "Google Digital Garage", "Google Career Certificates"]

        Query: "uni"
        Output: ["Coursera (Universities)", "edX (Universities)", "MIT OpenCourseware", "Stanford Online", "HarvardX"]

        Query: "${query}"
        Output:`;
        break;
      default:
        // Default to subject suggestions if type is not specified or recognized
        prompt = `Given the search query "${query}", suggest up to 5 concise and distinct course subject titles. Return only a JSON array of strings.

        Examples:
        Query: "AI"
        Output: ["Artificial Intelligence Fundamentals", "Advanced AI Concepts", "Machine Learning in AI", "AI Ethics and Society", "Practical AI Applications"]
        
        Query: "web dev"
        Output: ["Introduction to Web Development", "Frontend Web Design", "Backend Web Services", "Full-Stack Development with React", "Responsive Web Design"]

        Query: "${query}"
        Output:`;
        type = "subject"; // Set default type for logging/consistency
        break;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-preview-05-20",
      systemInstruction: "You are an Expert Course Creator",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          minItems: 3,
          maxItems: 10,
          items: {
            type: SchemaType.STRING
          }
        },
      },
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    let suggestions: string[] = [];

    // Attempt to parse the response as a JSON array of strings
    try {
      suggestions = JSON.parse(text);
      // Ensure it's an array of strings, just in case LLM generates something else
      if (
        !Array.isArray(suggestions) ||
        !suggestions.every((s) => typeof s === "string")
      ) {
        console.warn(
          "Gemini did not return a pure array of strings. Attempting fallback parsing."
        );
        throw new Error("Invalid JSON format from LLM.");
      }
    } catch (e) {
      console.error("Failed to parse Gemini JSON response directly:", e);
      // Fallback parsing for non-JSON formatted output or if JSON parsing fails
      // This regex works with ES2017 compatible targets
      const jsonMatch = text.match(/\[([\s\S]*?)\]/);
      if (jsonMatch && jsonMatch[1]) {
        suggestions = jsonMatch[1]
          .split(/["']?,\s*["']?/)
          .map((s) => s.replace(/^"|"$/g, "").trim())
          .filter((s) => s.length > 0);
      } else {
        // Further fallback: split by newlines, clean up
        suggestions = text
          .split("\n")
          .map((s) => s.trim().replace(/^- /, "").replace(/"/g, ""))
          .filter((s) => s.length > 0 && !s.startsWith("Output:"));
      }
    }

    // Final filter, deduplication, and limit
    suggestions = suggestions.map((s) => s.trim()).filter((s) => s.length > 0); // Trim and remove empties
    suggestions = Array.from(new Set(suggestions)).slice(0, 5); // Deduplicate and limit to 5

    return NextResponse.json(suggestions, { status: 200 });
  } catch (error) {
    console.error(`Error generating course ${type} suggestions:`, error);
    return NextResponse.json(
      {
        message: `Failed to generate ${type} suggestions`,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
