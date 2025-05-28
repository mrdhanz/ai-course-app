// app/courses/[courseId]/learn/page.tsx
'use client'

import { useEffect, useState, useRef, useCallback } from 'react' // Added useCallback
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Menu, BookOpen, Clock, Lightbulb, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Course, Lesson, Module } from '@/types/course'
import { useTheme } from 'next-themes'
import dynamic from "next/dynamic";
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
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

  const [openModuleAccordion, setOpenModuleAccordion] = useState<string | undefined>(undefined);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const contentControllerRef = useRef<AbortController | null>(null);
  const courseFetchControllerRef = useRef<AbortController | null>(null); // Ref for course fetch controller

  const [progress, setProgress] = useState(0);

  // Memoize getPreviousLesson and getNextLesson functions using useCallback
  // This prevents them from being redefined on every render if their dependencies haven't changed.
  const getPreviousLesson = useCallback(() => {
    if (!course || !currentModule || !currentLesson) return null;

    const currentModuleIndex = course.modules.findIndex(m => m.id === currentModule.id);
    if (currentModuleIndex === -1) return null;

    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentLessonIndex === -1) return null;

    if (currentLessonIndex > 0) {
      return {
        module: currentModule,
        lesson: currentModule.lessons[currentLessonIndex - 1]
      };
    } else {
      if (currentModuleIndex > 0) {
        const prevModule = course.modules[currentModuleIndex - 1];
        if (prevModule.lessons && prevModule.lessons.length > 0) {
          return {
            module: prevModule,
            lesson: prevModule.lessons[prevModule.lessons.length - 1]
          };
        }
      }
    }
    return null;
  }, [course, currentModule, currentLesson]); // Dependencies for useCallback

  const getNextLesson = useCallback(() => {
    if (!course || !currentModule || !currentLesson) return null;

    const currentModuleIndex = course.modules.findIndex(m => m.id === currentModule.id);
    if (currentModuleIndex === -1) return null;

    const currentLessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
    if (currentLessonIndex === -1) return null;

    if (currentLessonIndex < currentModule.lessons.length - 1) {
      return {
        module: currentModule,
        lesson: currentModule.lessons[currentLessonIndex + 1]
      };
    } else {
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
    return null;
  }, [course, currentModule, currentLesson]); // Dependencies for useCallback

  const [prevLessonData, setPrevLessonData] = useState<{
    module: Module;
    lesson: Lesson;
  } | null>(getPreviousLesson());
  const [nextLessonData, setNextLessonData] = useState<{
    module: Module;
    lesson: Lesson;
  } | null>(getNextLesson());

  // --- useEffect 1: Course Fetching and Initial State Setup ---
  useEffect(() => {
    // Abort previous course fetch if navigating quickly
    if (courseFetchControllerRef.current) {
      courseFetchControllerRef.current.abort();
      console.log('Previous course fetch aborted.');
    }

    const controller = new AbortController();
    const signal = controller.signal;
    courseFetchControllerRef.current = controller; // Store the new controller

    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/courses/${courseId}`, { signal });

        // Check for abortion immediately after fetch completes, before processing
        if (signal.aborted) {
          console.log('Course fetch aborted after response.');
          return;
        }

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

        if (!initialModule && data.modules?.length > 0) {
          initialModule = data.modules[0];
        }
        if (!initialLesson && initialModule && initialModule?.lessons?.length > 0) {
          initialLesson = initialModule.lessons[0];
        }

        // Only update state if this effect's fetch wasn't aborted
        if (!signal.aborted) {
          setCurrentModule(initialModule);
          setCurrentLesson(initialLesson);
          if (initialModule) {
            setOpenModuleAccordion(`module-${initialModule.id}`);
          } else {
            setOpenModuleAccordion(undefined);
          }
        }

      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Course fetch aborted by a new request.');
          return;
        }
        // Only set error if it's not an abort error for the current operation
        if (!signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch course');
        }
      } finally {
        // Only set loading to false if this specific fetch wasn't aborted
        if (!signal.aborted) {
          setLoading(false);
          // Clear the ref only if it's still pointing to this controller
          if (courseFetchControllerRef.current === controller) {
            courseFetchControllerRef.current = null;
          }
          setPrevLessonData(getPreviousLesson());
          setNextLessonData(getNextLesson());
        }
      }
    };

    if (!course) {
      fetchCourse();
    }

    return () => {
      // Abort controller on unmount or if dependencies change
      if (courseFetchControllerRef.current === controller) {
        controller.abort(); // Ensure this specific fetch is aborted
        courseFetchControllerRef.current = null;
      }
    };
  }, [courseId, params, course]); // `params` is a `URLSearchParams` object. It's stable for its reference,
  // but its internal state (parameters) changes. `useSearchParams` returns a new object on every render
  // which might cause this effect to run unnecessarily if not handled carefully.
  // However, for typical Next.js routing, `params` from `useSearchParams`
  // will only truly change in a way that affects your logic when the URL query parameters change.
  // If you only care about specific params (like 'module', 'lesson'), consider extracting them:
  // `const moduleId = params.get('module'); const lessonId = params.get('lesson');`
  // And then use `[courseId, moduleId, lessonId]` as dependencies.
  // For simplicity and common use cases, `params` is often acceptable as a dependency if the effect
  // truly needs to react to any change in query parameters.

  // --- useEffect 2: Lesson Content Fetching and Generation ---
  useEffect(() => {
    // Only proceed if course, currentModule, and currentLesson are available
    if (!course || !currentModule || !currentLesson) {
      // Potentially clear content if previous lesson existed but new ones don't
      if (currentLesson?.content && (!course || !currentModule)) {
        setCurrentLesson(prev => prev ? { ...prev, content: null } : null);
      }
      return;
    }

    // If the current lesson already has content, and we are not forcing a refresh,
    // prevent re-fetching/re-generating.
    // This is crucial for performance.
    if (currentLesson.content && !contentLoading) { // Only fetch if content is truly missing or contentLoading state indicated a failure
      return;
    }

    // Abort any previous content generation request
    if (contentControllerRef.current) {
      contentControllerRef.current.abort();
      console.log('Previous content generation request aborted.');
    }

    const controller = new AbortController();
    const signal = controller.signal;
    contentControllerRef.current = controller; // Store the new controller for this specific request

    const fetchAndGenerateLessonContent = async () => {
      setContentLoading(true);
      setError(null); // Clear previous errors

      try {
        // Step 1: Try to fetch existing content from the server
        let fetchedLesson: Lesson | null = null;
        try {
          const res = await fetch(`/api/courses/${course.id}/${currentModule.id}/${currentLesson.id}`, {
            headers: { 'Content-Type': 'application/json' },
            signal // Pass signal to existing content fetch
          });
          if (signal.aborted) return; // Check if aborted after fetch

          if (res.ok) {
            fetchedLesson = await res.json() as Lesson;
            if (fetchedLesson.content) {
              // Found existing content, update state and stop
              setCurrentLesson(fetchedLesson);
              setContentLoading(false);
              console.log('Using existing lesson content.');
              return;
            }
          }
        } catch (existingFetchErr) {
          if (existingFetchErr instanceof Error && existingFetchErr.name === 'AbortError') {
            console.log('Existing content fetch aborted.');
            return;
          }
          console.error("Failed to fetch existing lesson content (this is often fine):", existingFetchErr);
          // Don't set error here, proceed to generate if it's just missing
        }

        // Step 2: If no existing content or fetch failed (but not aborted), generate it
        const prevLessonData = getPreviousLesson(); // Note: getPreviousLesson is memoized
        const body: GenerateContentRequest = {
          courseTitle: course.title,
          verifiedBy: course.verifiedBy,
          moduleNo: currentModule.no || course.modules.findIndex(m => m.id === currentModule.id) + 1,
          moduleTitle: currentModule.title,
          moduleDesc: currentModule.description,
          previousLessonNo: prevLessonData?.lesson?.no || (prevLessonData?.lesson ? currentModule.lessons.findIndex(l => l.id === prevLessonData.lesson!.id) + 1 : undefined),
          previousLessonTitle: prevLessonData?.lesson?.title,
          lessonNo: currentLesson.no || currentModule.lessons.findIndex(l => l.id === currentLesson.id) + 1,
          lessonTitle: currentLesson.title,
          level: course.difficultyLevel,
          lang: course.language,
          format: 'markdown'
        };

        const generateRes = await fetch('/api/ai/course/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });


        if (!generateRes.ok) {
          const errorData = await generateRes.json();
          throw new Error(errorData.error || 'Failed to generate content');
        }

        const reader = generateRes.body?.getReader();
        if (!reader) {
          throw new Error('Failed to get readable stream from response.');
        }

        const decoder = new TextDecoder();
        let done = false;
        let accumulatedContent = '';

        while (!done) { // Crucial: Check signal.aborted in the loop
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // Update current lesson content incrementally
          setCurrentLesson(prev => ({
            ...prev!,
            title: body.lessonTitle,
            content: accumulatedContent
          }));
        }

        // If content generation completed successfully and was not aborted, save it
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

          setContentLoading(false);
        }

      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('Content generation request was aborted.');
          // Don't set error for aborts as it's an expected behavior during navigation
          return;
        }
        // Only set error if it's not an abort error for the current operation
        if (!signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load lesson content');
        }
      } finally {
        // Only set contentLoading to false if this specific request wasn't aborted
        if (!signal.aborted) {
          setContentLoading(false);
          // Clear the ref only if it's still pointing to this controller
          if (contentControllerRef.current === controller) {
            contentControllerRef.current = null;
          }
          setPrevLessonData(getPreviousLesson());
          setNextLessonData(getNextLesson());
        }
      }
    };

    if (!currentLesson.content)
      fetchAndGenerateLessonContent(); // Execute the content fetch/generate logic

    return () => {
      // Cleanup on unmount or if dependencies change, aborting the pending request
      if (contentControllerRef.current === controller) {
        controller.abort(); // Abort the specific request initiated by this effect run
        contentControllerRef.current = null; // Clear the ref
      }
    };
    // Dependencies:
    // course: needed for course details (title, level, etc.)
    // currentModule: needed for module details (title, description)
    // currentLesson: crucial for knowing which lesson's content to fetch/generate.
    // getPreviousLesson: This is a memoized function (using useCallback), so it only changes
    // when its internal dependencies (course, currentModule, currentLesson) change, which is correct.
  }, [course, currentModule, currentLesson, getPreviousLesson]);


  // --- useEffect 3: Progress Calculation ---
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
    } else {
      // Reset progress if course/module/lesson become null (e.g., during initial loading)
      setProgress(0);
    }
    // Dependencies for progress: `course`, `currentModule`, `currentLesson`.
    // These are the only pieces of state that affect the progress calculation.
  }, [course, currentModule, currentLesson]);


  // `handleLessonChange` does not need useCallback unless passed to a `React.memo` child component
  // or if it's used in a dependency array of another effect that also depends on `router` or `courseId`.
  // Currently, it's fine as is.
  const handleLessonChange = (lesson: Lesson, module: Module) => {
    if (currentLesson?.id !== lesson.id || currentModule?.id !== module.id) {
      setCurrentLesson(lesson);
      setCurrentModule(module);
      setPrevLessonData(getPreviousLesson());
      setNextLessonData(getNextLesson());
      router.push(`/courses/${courseId}/learn?module=${module.id}&lesson=${lesson.id}`);
      setIsMobileSidebarOpen(false);
    }
  };

  const ShimmerCard = () => { /* ... (ShimmerCard remains the same) ... */
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

  if (loading && !course) { /* ... (Loading state remains the same) ... */
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

  if (error && !course) { /* ... (Full page error remains the same) ... */
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

  if (!course) { /* ... (Course not found remains the same) ... */
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

  const sidebarContent = ( /* ... (Sidebar content remains the same) ... */
    <>
      <div className="p-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-4" title={course.title}>{course.title}</h2>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4 mr-1" />
          {Math.ceil(course.totalDuration / 24)} weeks
        </div>
        <div className="w-full mt-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Progress:</p>
          <Progress value={progress} className="w-full h-2 rounded-full [&>div]:bg-islamic-green [&>div]:dark:bg-soft-blue" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">{Math.round(progress)}% Complete</p>
        </div>
        <Separator className="my-2 bg-gray-200 dark:bg-gray-700" />
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
                ${currentModule?.id === module.id ? 'bg-islamic-green/15 dark:bg-soft-blue/15 text-islamic-green dark:text-soft-blue' : `${contentLoading ? '': 'hover:bg-gray-100 dark:hover:bg-gray-700 '}text-gray-800 dark:text-white`}
                flex flex-col items-start w-full pr-4`}
                disabled={contentLoading}
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
                    className={`flex items-center p-2 rounded-md ${!contentLoading ? 'cursor-pointer ' : ''}transition-colors duration-200
                      ${currentLesson?.id === lesson.id ? 'bg-islamic-green/10 dark:bg-soft-blue/10 text-islamic-green dark:text-soft-blue font-semibold' : `${contentLoading ? '': 'hover:bg-gray-100 dark:hover:bg-gray-700 '} text-gray-700 dark:text-gray-300`}`}
                    onClick={() => !contentLoading && handleLessonChange(lesson, module)}
                  >
                    {contentLoading && currentLesson?.id === lesson.id  ? <Loader2 className={`h-4 w-4 mr-2 animate-spin flex-shrink-0 ${currentLesson?.id === lesson.id ? 'text-islamic-green dark:text-soft-blue' : 'text-gray-400 dark:text-gray-500'}`}/>:
                    <CheckCircle2 className={`h-4 w-4 mr-2 flex-shrink-0 ${currentLesson?.id === lesson.id ? 'text-islamic-green dark:text-soft-blue' : 'text-gray-400 dark:text-gray-500'}`} />
                    }
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

          <div className="flex-1 text-center hidden md:block px-4 truncate">
            <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 truncate" title={currentLesson?.title || 'Select a lesson'}>
              {currentLesson?.title || 'Select a lesson'}
            </h1>
          </div>

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
      <div className="flex flex-1 pt-16 pb-16">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block fixed top-16 left-0 bottom-0 w-80 border-r border-islamic-green/20 dark:border-soft-blue/20 p-4 overflow-y-auto bg-parchment dark:bg-dark-gray z-40 shadow-lg">
          {sidebarContent}
        </aside>

        {/* Lesson Content Main Area */}
        <main className="flex-1 p-6 overflow-y-auto lg:ml-80 pb-20">
          {contentLoading && (currentLesson && !currentLesson.content) ? (
            <div className="max-w-4xl mx-auto">
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
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-parchment dark:bg-dark-gray border-t border-islamic-green/20 dark:border-soft-blue/20 p-4 lg:pl-80 shadow-md">
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
            <span className="hidden sm:inline">Previous Lesson: {prevLessonData?.lesson.title || 'Start'}</span>
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
            <span className="hidden sm:inline">Next Lesson: {nextLessonData?.lesson.title || 'Finish'}</span> <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </footer>
    </div>
  )
}