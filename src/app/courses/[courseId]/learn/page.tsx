// app/courses/[courseId]/learn/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react' // Added useRef
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Menu, BookOpen, Clock, Lightbulb, CheckCircle2 } from 'lucide-react' // Added more icons
import Link from 'next/link'
import { Course, Lesson, Module } from '@/types/course'
import { useTheme } from 'next-themes'
import dynamic from "next/dynamic";
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { Progress } from '@/components/ui/progress' // Assuming you have a Progress component (from Shadcn UI or similar)
import { Separator } from '@/components/ui/separator' // Assuming you have a Separator component

// Import Shadcn UI Accordion components
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

// Import Shadcn UI Sheet components for responsive sidebar
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose // For closing the sheet programmatically
} from "@/components/ui/sheet"

const SunIcon = dynamic(() => import('@/components/SunIcon'), { ssr: false })
const MoonIcon = dynamic(() => import('@/components/MoonIcon'), { ssr: false })

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

export default function CourseLearnPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { courseId } = useParams();
  const params = useSearchParams();

  const [course, setCourse] = useState<Course | null>(null);
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for controlling the open module in the accordion
  const [openModuleAccordion, setOpenModuleAccordion] = useState<string | undefined>(undefined);
  // State for mobile sidebar visibility (controlled by Sheet)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Ref to store AbortController for content generation
  const contentControllerRef = useRef<AbortController | null>(null);

  // Calculate overall course progress (simple example)
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Abort previous course fetch if navigating quickly
    const courseFetchController = new AbortController();
    const courseFetchSignal = courseFetchController.signal;

    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/courses/${courseId}`, { signal: courseFetchSignal });
        if (courseFetchSignal.aborted) return;

        if (!res.ok) throw new Error('Failed to fetch course');
        const data = await res.json();
        setCourse(data);

        const moduleIdFromUrl = params.get('module');
        const lessonIdFromUrl = params.get('lesson');

        let initialModule: Module | null = null;
        let initialLesson: Lesson | null = null;

        if (moduleIdFromUrl) {
          initialModule = data.modules.find((m: Module) => m.id === moduleIdFromUrl) || null;
        }
        if (initialModule && lessonIdFromUrl) {
          initialLesson = initialModule.lessons.find((l: Lesson) => l.id === lessonIdFromUrl) || null;
        }

        // Fallback to first module/lesson if URL params are not valid or not present
        if (!initialModule && data.modules?.length > 0) {
          initialModule = data.modules[0];
        }
        if (!initialLesson && initialModule && initialModule?.lessons?.length > 0) {
          initialLesson = initialModule.lessons[0];
        }

        setCurrentModule(initialModule);
        setCurrentLesson(initialLesson);

        // Open the corresponding module in the accordion
        if (initialModule) {
          setOpenModuleAccordion(`module-${initialModule.id}`);
        } else {
          setOpenModuleAccordion(undefined); // Close all if no module selected
        }

      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.log('Course fetch aborted.');
            return;
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch course');
      } finally {
        if (!courseFetchSignal.aborted) {
            setLoading(false);
        }
      }
    };
    
    fetchCourse();

    return () => {
        courseFetchController.abort(); // Cleanup on unmount or re-run
    };
  }, [courseId, params]);

  // Effect to fetch lesson content
  useEffect(() => {
    if (!course || !currentModule || !currentLesson) return;

    // Abort any previous content generation request
    if (contentControllerRef.current) {
        contentControllerRef.current.abort();
        console.log('Previous content generation request aborted.');
    }

    const controller = new AbortController();
    const signal = controller.signal;
    contentControllerRef.current = controller; // Store the new controller

    const fetchLessonContent = async () => {
      try {
        setContentLoading(true);
        setError(null);

        const moduleIndex = course.modules.findIndex(m => m.id === currentModule.id);
        if (moduleIndex === -1) return;
        const lessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
        if (lessonIndex === -1) return;

        // Try to fetch existing content from the server first
        try {
            const res = await fetch(`/api/courses/${course.id}/${currentModule.id}/${currentLesson.id}`, {
              headers: { 'Content-Type': 'application/json' },
              signal // Pass signal to existing content fetch
            });
            if (signal.aborted) return; // Check if aborted after fetch

            if (res.ok) {
                const lesson = await res.json() as Lesson;
                if (lesson.content) {
                    setCurrentLesson(lesson);
                    setContentLoading(false);
                    console.log('Using existing lesson content.');
                    return; // Use existing content if available
                }
            }
        } catch (er) {
            if (er instanceof Error && er.name === 'AbortError') {
                console.log('Existing content fetch aborted.');
                return;
            }
            console.error("Failed to fetch existing lesson content:", er);
        }

        // If no existing content, generate it
        const prevLessonData = getPreviousLesson(); // Need this for the body
        const body: GenerateContentRequest = {
          courseTitle: course.title,
          verifiedBy: course.verifiedBy,
          moduleNo: currentModule?.no || moduleIndex + 1,
          moduleTitle: currentModule.title,
          moduleDesc: currentModule.description,
          previousLessonNo: prevLessonData?.lesson?.no || (prevLessonData?.lesson ? lessonIndex : undefined),
          previousLessonTitle: prevLessonData?.lesson?.title,
          lessonNo: currentLesson?.no || lessonIndex + 1,
          lessonTitle: currentLesson.title,
          level: course.difficultyLevel,
          lang: course.language,
          format: 'markdown'
        };

        const res = await fetch('/api/ai/course/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to generate content');
        }

        // Read the streamed response
        const reader = res.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get readable stream from response.');
        }

        const decoder = new TextDecoder();
        let done = false;
        let accumulatedContent = '';

        while (!done) { // Also check signal.aborted in the loop
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          const chunk = decoder.decode(value, { stream: true }); // Decode incrementally
          accumulatedContent += chunk;

          setCurrentLesson(prev => ({
            ...prev!,
            title: body.lessonTitle,
            content: accumulatedContent
          }));
        }

        // Only save if content generation completed and was not aborted
        if (done && currentModule?.id && currentLesson && accumulatedContent) {
          fetch(`/api/courses/${course.id}/${currentModule?.id}/${currentLesson?.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: body.lessonTitle,
              content: accumulatedContent
            })
          }).catch(saveErr => console.error("Failed to save generated content:", saveErr));
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.log('Content generation request was aborted.');
            return; // Ignore AbortError
        }
        setError(err instanceof Error ? err.message : 'Failed to load lesson content');
      } finally {
        if (!signal.aborted) { // Only set loading to false if this specific request wasn't aborted
            setContentLoading(false);
            if (contentControllerRef.current === controller) {
                contentControllerRef.current = null; // Clear the ref
            }
        }
      }
    };

    // Only fetch if content doesn't exist for the current lesson or if content is loading
    // to ensure it re-fetches if generation failed before.
    if (!currentLesson.content) {
      fetchLessonContent();
    }
  }, [course, currentModule, currentLesson]); // Dependencies for content fetch

  // Calculate progress whenever currentLesson changes
  useEffect(() => {
    if (course && currentModule && currentLesson) {
      let completedLessons = 0;
      let totalLessons = 0;

      course.modules.forEach(module => {
        totalLessons += module.lessons.length;
        // This is a simplification. A real app would track actual completion
        // For now, we'll mark lessons up to the current one as "completed"
        if (module.id === currentModule.id) {
          for (const lesson of module.lessons) {
            completedLessons++;
            if (lesson.id === currentLesson.id) break; // Stop counting at current lesson
          }
        } else {
          // If a module comes before the current module, assume all its lessons are done
          const currentModuleIndex = course.modules.findIndex(m => m.id === currentModule.id);
          const moduleIndex = course.modules.findIndex(m => m.id === module.id);
          if (moduleIndex < currentModuleIndex) {
            completedLessons += module.lessons.length;
          }
        }
      });
      setProgress(totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0);
    }
  }, [course, currentModule, currentLesson]);


  const handleLessonChange = (lesson: Lesson, module: Module) => {
    // Only update if it's a new lesson
    if (currentLesson?.id !== lesson.id || currentModule?.id !== module.id) {
        setCurrentLesson(lesson);
        setCurrentModule(module); // Ensure currentModule is set when a lesson is directly clicked
        router.push(`/courses/${courseId}/learn?module=${module.id}&lesson=${lesson.id}`);
    }
    setIsMobileSidebarOpen(false); // Close mobile sidebar after selection
  };

  const getNextLesson = () => {
    if (!course || !currentModule || !currentLesson) return null;

    const currentModuleIndex = course.modules.findIndex(m => m.id === currentModule.id);
    if (currentModuleIndex === -1) return null;

    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentLessonIndex === -1) return null;

    // Check if there's a next lesson in the current module
    if (currentLessonIndex < currentModule.lessons.length - 1) {
      return {
        module: currentModule,
        lesson: currentModule.lessons[currentLessonIndex + 1]
      };
    } else {
      // Check if there's a next module
      if (currentModuleIndex < course.modules.length - 1) {
        const nextModule = course.modules[currentModuleIndex + 1];
        if (nextModule.lessons && nextModule.lessons.length > 0) {
          return {
            module: nextModule,
            lesson: nextModule.lessons[0]
          };
        }
      }
    }
    return null; // No next lesson found
  };

  const getPreviousLesson = () => {
    if (!course || !currentModule || !currentLesson) return null;

    const currentModuleIndex = course.modules.findIndex(m => m.id === currentModule.id);
    if (currentModuleIndex === -1) return null;

    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentLessonIndex === -1) return null;

    // Check if there's a previous lesson in the current module
    if (currentLessonIndex > 0) {
      return {
        module: currentModule,
        lesson: currentModule.lessons[currentLessonIndex - 1]
      };
    } else {
      // Check if there's a previous module
      if (currentModuleIndex > 0) {
        const prevModule = course.modules[currentModuleIndex - 1];
        if (prevModule.lessons && prevModule.lessons.length > 0) {
          // Go to the last lesson of the previous module
          return {
            module: prevModule,
            lesson: prevModule.lessons[prevModule.lessons.length - 1]
          };
        }
      }
    }
    return null; // No previous lesson found
  };

  const nextLessonData = getNextLesson();
  const prevLessonData = getPreviousLesson();

  // Shimmer effect for loading content
  const ShimmerCard = () => {
    return (
      <div className="animate-pulse flex flex-col space-y-4 p-6 rounded-lg shadow bg-gray-50 dark:bg-gray-800 my-6 border border-gray-200 dark:border-gray-700">
        <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-full"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-5/6"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
      </div>
    );
  };

  // Loading/Error/Not Found States (More robust)
  if (loading && !course) {
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex flex-col items-center justify-center p-8">
        <div className="text-center">
            <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-4">Loading Course</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">Please wait while we fetch the course details...</p>
        </div>
        <div className="max-w-xl w-full px-4 sm:px-6 lg:px-8">
            <ShimmerCard />
            <ShimmerCard />
            <ShimmerCard />
        </div>
      </div>
    );
  }

  if (error && !course) { // Only show full error page if course itself failed to load
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <div className="text-center p-8 max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-red-200 dark:border-red-700">
          <h2 className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-4">Error Loading Course</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 text-white font-semibold py-2 px-6 rounded-md transition-colors duration-200"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!course) { // Course not found after loading
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <div className="text-center p-8 max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-yellow-200 dark:border-yellow-700">
          <h2 className="text-3xl font-extrabold text-yellow-600 dark:text-yellow-400 mb-4">Course Not Found</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">The course you are looking for does not exist or has been removed.</p>
          <Button
            onClick={() => router.push('/courses')}
            className="bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90 text-white font-semibold py-2 px-6 rounded-md transition-colors duration-200"
          >
            Browse Courses
          </Button>
        </div>
      </div>
    );
  }

  // Content for the Sidebar (reused for desktop and mobile sheet)
  const sidebarContent = (
    <>
      <div className="p-2 mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-4" title={course.title}>{course.title}</h2>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4 mr-1" />
            {Math.ceil(course.totalDuration / 24)} weeks
        </div>
        <div className="w-full mt-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Progress:</p>
            <Progress value={progress} className="w-full h-2 rounded-full [&>div]:bg-islamic-green [&>div]:dark:bg-soft-blue"/>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{Math.round(progress)}% Complete</p>
        </div>
        <Separator className="my-4 bg-gray-200 dark:bg-gray-700" />
      </div>

      <h3 className="font-semibold text-islamic-green dark:text-soft-blue mb-3 px-2">Course Modules</h3>
      <Accordion
        type="single"
        collapsible
        value={openModuleAccordion}
        onValueChange={setOpenModuleAccordion}
        className="w-full"
      >
        {course.modules?.map((module, m) => (
          <AccordionItem
            key={module.id}
            value={`module-${module.id}`}
            className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
          >
            <AccordionTrigger
              className={`p-2 rounded-lg hover:no-underline text-base font-medium transition-colors duration-200
                ${currentModule?.id === module.id ? 'bg-islamic-green/15 dark:bg-soft-blue/15 text-islamic-green dark:text-soft-blue' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-white'}
                flex flex-col items-start w-full pr-4`}
            >
              <span className="text-sm font-semibold mb-1">Module {(module?.no || (m + 1))}</span>
              <h4 className="font-bold text-left">{module.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 text-left mt-1">
                <BookOpen className="h-3 w-3 inline-block mr-1 -mt-0.5" /> {module.lessons?.length} lessons • <Clock className="h-3 w-3 inline-block mr-1 -mt-0.5" /> {module.durationHours} hours
              </p>
            </AccordionTrigger>
            <AccordionContent className="pb-2 pt-0">
              <ul className="space-y-1 pl-4 py-2 border-l-2 border-islamic-green/20 dark:border-soft-blue/20 ml-3">
                {module.lessons?.map((lesson, i) => (
                  <li
                    key={lesson.id}
                    className={`flex items-center p-2 rounded-md cursor-pointer transition-colors duration-200
                      ${currentLesson?.id === lesson.id ? 'bg-islamic-green/10 dark:bg-soft-blue/10 text-islamic-green dark:text-soft-blue font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                    onClick={() => handleLessonChange(lesson, module)}
                  >
                    <CheckCircle2 className={`h-4 w-4 mr-2 flex-shrink-0 ${currentLesson?.id === lesson.id ? 'text-islamic-green dark:text-soft-blue' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span>{lesson?.no || (i + 1)}. {lesson.title}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-parchment dark:bg-dark-gray text-gray-900 dark:text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-parchment dark:bg-dark-gray border-b border-islamic-green/20 dark:border-soft-blue/20 p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center h-full">
          <div className="flex items-center">
            {/* Mobile Sidebar Toggle (Sheet) - visible on small screens, hidden on large */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild className="lg:hidden mr-4">
                <Button variant="ghost" size="icon" className="text-islamic-green dark:text-soft-blue">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 sm:w-80 p-4 overflow-y-auto bg-parchment dark:bg-dark-gray">
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-islamic-green dark:text-soft-blue text-2xl font-bold">Course Navigation</SheetTitle>
                  <SheetClose asChild>
                    {/* An invisible button or just let sheet close on outside click/esc */}
                    <Button variant="ghost" size="sm" className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                        &times;
                    </Button>
                  </SheetClose>
                </SheetHeader>
                <div className="mt-4">
                  {sidebarContent}
                </div>
              </SheetContent>
            </Sheet>

            <Link href={`/courses/${courseId}`} className="text-islamic-green dark:text-soft-blue hover:underline flex items-center text-sm sm:text-base font-medium">
              <ChevronLeft className="inline mr-1 h-4 w-4" /> Back to Course Overview
            </Link>
          </div>

          {/* Current Lesson Title in Header */}
          <div className="flex-1 text-center hidden md:block px-4 truncate">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate" title={currentLesson?.title || 'Select a lesson'}>
                {currentLesson?.title || 'Select a lesson'}
            </h1>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-islamic-green dark:text-soft-blue border-islamic-green/20 dark:border-soft-blue/20 ml-auto md:ml-4"
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 pt-16 pb-16"> {/* Adjusting padding for fixed header and footer */}
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block fixed top-16 left-0 bottom-0 w-80 border-r border-islamic-green/20 dark:border-soft-blue/20 p-4 overflow-y-auto bg-parchment dark:bg-dark-gray z-40 shadow-lg">
          {sidebarContent}
        </aside>

        {/* Lesson Content Main Area */}
        <main className="flex-1 p-6 overflow-y-auto lg:ml-80 pb-20">
          {contentLoading && (currentLesson && !currentLesson.content) ? (
            <div className="max-w-4xl mx-auto"> {/* Increased max-width for content shimmer */}
                <ShimmerCard />
                <ShimmerCard />
                <ShimmerCard />
            </div>
          ) : (
            currentLesson ? (
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200">
                        <MarkdownRenderer content={currentLesson.content || 'No content available for this lesson yet.'} />
                    </div>
                </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400 p-8">
                <Lightbulb className="h-16 w-16 mb-4 text-islamic-green dark:text-soft-blue" />
                <p className="text-xl font-semibold mb-2">Welcome to your course!</p>
                <p className="text-md">Select a module and lesson from the sidebar to start learning.</p>
              </div>
            )
          )}
           {/* In-content error for lesson generation */}
          {error && currentLesson && (
                <div className="mt-8 p-6 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg shadow-sm text-center border border-red-200 dark:border-red-700 max-w-4xl mx-auto">
                    <h3 className="text-xl font-semibold mb-2">Failed to load/generate lesson content</h3>
                    <p>{error}</p>
                    <Button onClick={() => window.location.reload()} className="mt-4 bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 text-white">
                        Retry Lesson
                    </Button>
                </div>
            )}
        </main>
      </div>

      {/* Fixed Footer for Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-parchment dark:bg-dark-gray border-t border-islamic-green/20 dark:border-soft-blue/20 p-4 lg:pl-80 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <Button
            variant="link"
            onClick={() => {
              if (prevLessonData) {
                handleLessonChange(prevLessonData.lesson, prevLessonData.module);
              }
            }}
            disabled={!prevLessonData || contentLoading}
            className="text-gray-700 dark:text-gray-300 hover:text-islamic-green dark:hover:text-soft-blue transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            <span className="hidden sm:inline">Previous Lesson:</span> {prevLessonData?.lesson.title || 'Start'}
          </Button>
          <Button
            variant="link"
            onClick={() => {
              if (nextLessonData) {
                handleLessonChange(nextLessonData.lesson, nextLessonData.module);
              }
            }}
            disabled={!nextLessonData || contentLoading}
            className="text-gray-700 dark:text-gray-300 hover:text-islamic-green dark:hover:text-soft-blue transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Next Lesson:</span> {nextLessonData?.lesson.title || 'Finish'} <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  )
}