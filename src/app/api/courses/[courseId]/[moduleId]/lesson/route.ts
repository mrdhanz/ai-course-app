import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface RequestParams { courseId: string; moduleId: string }

// POST - Create new lesson
export async function POST(
  request: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { courseId, moduleId } = await params;

  try {
    const body = await request.json();

    // Verify module belongs to course
    const modul = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId: courseId,
      },
    });

    if (!modul) {
      return NextResponse.json(
        { error: "Module not found in this course" },
        { status: 404 }
      );
    }

    const lesson = await prisma.lesson.create({
      data: {
        title: body.title,
        content: body.content,
        moduleId: moduleId,
      },
    });

    return NextResponse.json(lesson, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create lesson" },
      { status: 500 }
    );
  }
}

// GET - List all lessons in module
export async function GET(
  request: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { courseId, moduleId } = await params;

  try {
    // Verify module belongs to course
    const modul = await prisma.module.findFirst({
      where: {
        id: moduleId,
        courseId: courseId,
      },
    });

    if (!modul) {
      return NextResponse.json(
        { error: "Module not found in this course" },
        { status: 404 }
      );
    }

    const lessons = await prisma.lesson.findMany({
      where: { moduleId: moduleId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(lessons);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch lessons" },
      { status: 500 }
    );
  }
}