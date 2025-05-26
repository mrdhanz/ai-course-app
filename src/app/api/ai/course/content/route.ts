// File: app/api/generate-content/route.ts
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface GenerateContentRequest {
  level: string;
  verifiedBy: string;
  courseTitle: string;
  moduleNo: number;
  moduleTitle: string;
  moduleDesc: string;
  previousLessonNo?: number;
  previousLessonTitle?: string;
  lessonTitle: string;
  lessonNo: number;
  lang: string;
  format: string;
}

const API_KEY = process.env.GEMINI_API_KEY; // It's best practice to use environment variables

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in environment variables.');
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(request: Request) {
  try {
    const requestData: GenerateContentRequest = await request.json();

    // Validate required fields
    if (!requestData.level || !requestData.courseTitle || !requestData.lessonTitle) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-05-20' });

const prompt = `You are an exceptionally skilled and experienced **expert writer** and **master instructor**, specializing in creating highly effective, pedagogically sound, and human-readable educational content. Your primary objective is to develop a **comprehensive, self-contained lesson** for a specific topic.

**Course & Module Context:**
This lesson is an integral part of the "${requestData.courseTitle}" course, which is meticulously designed for **absolute beginners** in this domain. The entire course content is strictly verified and endorsed by **${requestData.verifiedBy}**, ensuring utmost accuracy, clarity, and pedagogical soundness.

This particular lesson belongs to **Module ${requestData.moduleNo}: "${requestData.moduleTitle}"**, a module specifically dedicated to **mastering ${requestData.moduleDesc}**.

**Lesson Specifics:**
* **Lesson Level:** ${requestData.level}
* **Lesson Number:** ${requestData.lessonNo}
* **Lesson Title:** "${requestData.lessonTitle}"
* **Language:** ${requestData.lang}
${requestData.previousLessonTitle ? `* **Building From:** This lesson builds upon the concepts introduced in **Lesson ${requestData.previousLessonNo}: "${requestData.previousLessonTitle}"**. (If applicable, connect current concepts to prior knowledge).` : ''}

**Content Requirements:**
Generate the complete lesson content, focusing on clarity, conciseness, and practical understanding for a beginner audience. The lesson should:
1.  **Introduce the topic** clearly and engagingly, setting the stage for what will be learned, potentially linking back to the previous lesson's foundation.
2.  **Explain core concepts** thoroughly, breaking down complex ideas into digestible segments.
3.  Provide **conceptual examples** (code, scenarios, analogies) where appropriate to illustrate points and enhance comprehension.
4.  Maintain a **logical and pedagogical flow** suitable for self-study, building knowledge incrementally.
5.  Conclude with a brief summary or key takeaways.

**Output Format Requirements:**
The entire output must be presented in **${requestData.format}** format. Adhere strictly to the following structural guidelines:
* Use **clear, hierarchical headings** (e.g., \`#\`, \`##\`, \`###\`, \`####\`) to organize content logically and improve readability.
* Utilize **bullet points** and **numbered lists** extensively for presenting information clearly, emphasizing key points, and outlining steps.
* Include **code blocks** (e.g., \`\`\`language\`\`\`) for any conceptual code examples, syntax demonstrations, or command-line instructions. Ensure code is well-formatted and easy to understand.

**Strictly for Diagrams and Visuals (Mermaid):**
* For any content that benefits from visual representation, such as charts, graphs, flowcharts, sequence diagrams, state diagrams, or architectural designs, you **MUST** use **Mermaid syntax**.
* Embed Mermaid code within standard code blocks, specifically using \`\`\`mermaid\`\`\`.
* **Crucially, adhere strictly to Mermaid version 11 syntax rules as documented on \`https://mermaid.js.org/syntax\`**. Ensure the Mermaid code is valid, accurate, and renders correctly to convey the intended visual information.

**Strict Output Constraint:**
**The answer MUST contain ONLY the complete lesson content itself.** Do NOT include any introductory or concluding remarks outside the lesson material, conversational text, or any other extraneous information. Begin directly with the lesson's title or first heading.`;
    const streamingResponse = await model.generateContentStream(prompt);

    // Create a ReadableStream from the async generator
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamingResponse.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Error in streaming response:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8', // Or 'text/event-stream' if you want to explicitly use SSE
      },
    });

  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}