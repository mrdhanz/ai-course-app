import { NextResponse } from "next/server";
import gemini from "@/lib/gemini";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q"); // The user's input query
  // Define the prompt for image generation. This prompt is provided by the user.
  const imagePrompt = `Generate a professional and engaging image cover for a course. The design should prominently display the actual course title, ${query}, using a clear, legible, and aesthetically pleasing font.
  The background should be visually interesting but not distracting, chosen from one of the following styles:
  A sophisticated, abstract gradient of two to three complementary colors.
  A subtle, thematic pattern or texture that hints at the course subject.
  A high-quality, relevant photographic element, stylized or blurred to ensure the title remains the focal point.
  A clean, illustrative graphic that conceptually represents the core idea of the course.
  Incorporate a small, relevant icon or graphic element that subtly reinforces the course's theme without cluttering the overall composition. The layout should be balanced and harmonious, guiding the viewer's eye towards the title. The color palette should be professional, inviting, and evoke a sense of learning and expertise. The final image should be suitable for a digital learning platform, conveying the essence and value of the course at a glance`;

  try {
    const body = {
      contents: [
        {
          parts: [{ text: imagePrompt }],
        },
      ],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:generateContent?key=${gemini.apiKey}`,
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
    const result = await res.json();
    
    if (
      result &&
      result &&
      result.candidates &&
      result.candidates.length > 0
    ) {
      const candidate = result.candidates[0];
      const imageDataPart = candidate.content.parts.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (part: any) =>
          part.inlineData && part.inlineData.mimeType.startsWith("image/")
      );

      if (
        imageDataPart &&
        imageDataPart.inlineData &&
        imageDataPart.inlineData.data
      ) {
        const imageData = imageDataPart.inlineData.data;
        const imageUrl = `data:${imageDataPart.inlineData.mimeType};base64,${imageData}`;
        return NextResponse.json({ imageUrl }, { status: 200 });
      } else {
        console.error("Image data not found in SDK response:", result);
        return NextResponse.json(
          {
            message: "Failed to extract image data from SDK response",
            details: result,
          },
          { status: 404 }
        );
      }
    } else {
      // If image data is not found in the response, send an error.
      console.error("Image generation failed (SDK response):", result);
      return NextResponse.json(
        { message: "Failed to generate image via SDK", details: result },
        { status: 500 }
      );
    }
  } catch (error) {
    // Catch any errors during the SDK operation.
    console.error("Error generating image with SDK:", error);
    return NextResponse.json(
      {
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    );
  }
}
