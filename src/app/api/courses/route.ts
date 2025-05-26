import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Sorting parameters
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Count total courses for pagination metadata
    const totalCourses = await prisma.course.count();
    const difficulty = searchParams.get("difficulty");
    const language = searchParams.get("lang");
    const search = searchParams.get("search");

    // Fetch paginated courses
    const courses = await prisma.course.findMany({
      where: {
        difficultyLevel:
          difficulty && difficulty !== "all" ? difficulty : undefined,
        language: language && language !== "all" ? language : undefined,
        OR:
          search && search?.length > 0
            ? [
                {
                  title: { contains: search },
                },
                { description: { contains: search } },
                {
                  skillsGained: { some: { skill: { contains: search } } },
                },
              ]
            : undefined,
      },
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        skillsGained: true,
      },
    });

    return NextResponse.json({
      data: courses,
      pagination: {
        total: totalCourses,
        totalPages: Math.ceil(totalCourses / limit),
        currentPage: page,
        perPage: limit,
        hasNextPage: page < Math.ceil(totalCourses / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const course = await prisma.course.create({
      data: {
        title: body.title,
        description: body.description,
        language: body.language,
        difficultyLevel: body.difficultyLevel,
        verifiedBy: body.verifiedBy,
        totalDuration: body.totalDuration,
        learningObjectives: {
          create:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body.learningObjective?.map((obj: any) => ({
              objective: obj,
            })) || [],
        },
        skillsGained: {
          create:
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body.skillsGain?.map((skill: any) => ({
              skill: skill,
            })) || [],
        },
        modules: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: body.modules.map((module: any, nom: any) => ({
            title: module.title,
            no: nom + 1,
            description: module.description,
            durationHours: module.durationHours,
            lessons: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              create: module.lessons.map((lesson: any, no: any) => ({
                title: lesson,
                no: no + 1,
              })),
            },
          })),
        },
      },
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

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
