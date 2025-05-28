import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get single course by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const id = (await params).courseId;
  try {
    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        learningObjectives: true,
        skillsGained: true,
        modules: {
          include: {
            lessons: {
              select: {
                id: true,
                title: true,
                moduleId: true,
                no: true,
                // Explicitly exclude content field
              },
              orderBy: { no: "asc" },
            },
          },
          orderBy: { no: "asc" },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update course by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const id = (await params).courseId;
  try {
    const body = await request.json();

    // First, get the existing course with relations
    const existingCourse = await prisma.course.findUnique({
      where: { id },
      include: {
        learningObjectives: true,
        skillsGained: true,
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Transaction for atomic updates
    const updatedCourse = await prisma.$transaction(async (prisma) => {
      // Delete existing relations that aren't in the new data
      await prisma.learningObjective.deleteMany({
        where: {
          courseId: id,
          id: {
            notIn:
              body.learningObjectives
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ?.filter((obj: any) => obj.id)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((obj: any) => obj.id) || [],
          },
        },
      });

      await prisma.skillGained.deleteMany({
        where: {
          courseId: id,
          id: {
            notIn:
              body.skillsGained
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ?.filter((skill: any) => skill.id)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .map((skill: any) => skill.id) || [],
          },
        },
      });

      // Update or create learning objectives
      const learningObjectives = body.learningObjectives
        ? await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body.learningObjectives.map((obj: any) =>
              obj.id
                ? prisma.learningObjective.update({
                    where: { id: obj.id },
                    data: { objective: obj.objective },
                  })
                : prisma.learningObjective.create({
                    data: {
                      objective: obj.objective,
                      courseId: id,
                    },
                  })
            )
          )
        : [];

      // Update or create skills gained
      const skillsGained = body.skillsGained
        ? await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body.skillsGained.map((skill: any) =>
              skill.id
                ? prisma.skillGained.update({
                    where: { id: skill.id },
                    data: { skill: skill.skill },
                  })
                : prisma.skillGained.create({
                    data: {
                      skill: skill.skill,
                      courseId: id,
                    },
                  })
            )
          )
        : [];

      // Update course itself
      const course = await prisma.course.update({
        where: { id },
        data: {
          title: body.title,
          description: body.description,
          language: body.language,
          difficultyLevel: body.difficultyLevel,
          verifiedBy: body.verifiedBy,
          totalDuration: body.totalDuration,
        },
      });

      return {
        ...course,
        learningObjectives,
        skillsGained,
      };
    });

    return NextResponse.json(updatedCourse);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

// DELETE - Delete course by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const id = (await params).courseId;
  try {
    // Using transaction to ensure all related data is deleted
    await prisma.$transaction([
      // Delete lessons first (deepest nested)
      prisma.lesson.deleteMany({
        where: {
          module: {
            courseId: id,
          },
        },
      }),
      // Then delete modules
      prisma.module.deleteMany({
        where: {
          courseId: id,
        },
      }),
      // Then delete learning objectives and skills
      prisma.learningObjective.deleteMany({
        where: {
          courseId: id,
        },
      }),
      prisma.skillGained.deleteMany({
        where: {
          courseId: id,
        },
      }),
      // Finally delete the course
      prisma.course.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json(
      { message: "Course deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
