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

    const prompt = `You are an expert writer and expert instructor. Your task is to develop comprehensive lesson content for a specific topic within a ${requestData.level}-level. 
                  Strictly The course verified by ${requestData.verifiedBy}
                  Course Context: This lesson belongs to the ${requestData.courseTitle} course, which targets absolute beginners in this context. 
                  Module Context: This specific lesson is part of the ${requestData.moduleTitle} module, no. module ${requestData.moduleNo}, which focuses on mastering ${requestData.moduleDesc}. 
                  Lesson Details: 
                  Lesson No: ${requestData.lessonNo}
                  Lesson Title: ${requestData.lessonTitle} 
                  Language: ${requestData.lang} 
                  Format Output: ${requestData.format}, using clear headings, bullet points, and code blocks (where appropriate for conceptual examples). 
                  (Strictly only for syntax mermaid): For specific content like charts, graphs, or even architectural designs, use Mermaid version 10.9.3 in code blocks and strictly follow mermaid.js.org/syntax rules.
                  Strictly the answer only the lesson content`;

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