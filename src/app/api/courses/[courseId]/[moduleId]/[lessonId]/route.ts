import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";

interface RequestParams { courseId: string; moduleId: string; lessonId: string }

// Helper function to verify course-module-lesson relationship
async function verifyLessonRelationship(
  courseId: string,
  moduleId: string,
  lessonId?: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereCondition: any = {
    id: moduleId,
    courseId: courseId,
  };

  if (lessonId) {
    whereCondition.lessons = {
      some: { id: lessonId },
    };
  }

  const modul = await prisma.module.findFirst({
    where: whereCondition,
    include: lessonId
      ? {
          lessons: {
            where: { id: lessonId },
          },
        }
      : {
        lessons: true,
      },
  });

  return modul;
}

// GET - Get single lesson
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RequestParams> }
) {
  // Await params to get the actual object
  const { courseId, moduleId, lessonId } = await params;
  try {
    const modul = await verifyLessonRelationship(courseId, moduleId, lessonId);

    if (!modul || !modul.lessons?.length) {
      return NextResponse.json(
        { error: "Lesson not found in this module and course" },
        { status: 404 }
      );
    }

    return NextResponse.json(modul.lessons[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update lesson
export async function PUT(
  request: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { courseId, moduleId, lessonId } = await params;

  try {
    const body = await request.json();
    const modul = await verifyLessonRelationship(courseId, moduleId, lessonId);

    if (!modul || !modul.lessons?.length) {
      return NextResponse.json(
        { error: "Lesson not found in this module and course" },
        { status: 404 }
      );
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: body.title,
        content: body.content,
      },
    });

    return NextResponse.json(updatedLesson);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update lesson" },
      { status: 500 }
    );
  }
}

// DELETE - Delete lesson
export async function DELETE(
  request: Request,
  { params }: { params: Promise<RequestParams> }
) {
  const { courseId, moduleId, lessonId } = await params;

  try {
    const modul = await verifyLessonRelationship(courseId, moduleId, lessonId);

    if (!modul || !modul.lessons?.length) {
      return NextResponse.json(
        { error: "Lesson not found in this module and course" },
        { status: 404 }
      );
    }

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    return NextResponse.json(
      { message: "Lesson deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete lesson" },
      { status: 500 }
    );
  }
}