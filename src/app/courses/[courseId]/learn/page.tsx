// app/courses/[courseId]/learn/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react' // Added X icon for close
import Link from 'next/link'
import { Course, Lesson, Module } from '@/types/course'
import { useTheme } from 'next-themes'
import dynamic from "next/dynamic";
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

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
} from "@/components/ui/sheet"

const SunIcon = dynamic(() => import('@/components/SunIcon'), { ssr: false })
const MoonIcon = dynamic(() => import('@/components/MoonIcon'), { ssr: false })

interface GenerateContentRequest {
  level: string;
  verifiedBy: string;
  courseTitle: string;
  courseDesc: string;
  moduleNo: number;
  moduleTitle: string;
  moduleDesc: string;
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
  // State for desktop sidebar visibility
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); // Default to open on desktop

  // Effect to fetch course data and initialize module/lesson based on URL params
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/courses/${courseId}`);
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
        setError(err instanceof Error ? err.message : 'Failed to fetch course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, params]); // Re-run effect when courseId or URL params change

  // Effect to fetch lesson content
  useEffect(() => {
    if (!course || !currentModule || !currentLesson) return;

    const fetchLessonContent = async () => {
      try {
        setContentLoading(true);
        setError(null);

        const moduleIndex = course.modules.findIndex(m => m.id === currentModule.id);
        if (moduleIndex === -1) return;
        const lessonIndex = currentModule.lessons.findIndex(l => l.id === currentLesson.id);
        if (lessonIndex === -1) return;

        // Try to fetch existing content from the server first
        if (currentModule?.id && currentLesson?.id) {
          try {
            const res = await fetch(`/api/courses/${course.id}/${currentModule.id}/${currentLesson.id}`, {
              headers: {
                'Content-Type': 'application/json',
              }
            });
            if (res.ok) {
              const lesson = await res.json() as Lesson;
              if (lesson.content) {
                setCurrentLesson(lesson);
                return; // Use existing content if available
              }
            }
          } catch (er) {
            console.error("Failed to fetch existing lesson content:", er);
          }
        }

        // If no existing content, generate it
        const body: GenerateContentRequest = {
          courseTitle: course.title,
          courseDesc: course.description,
          verifiedBy: course.verifiedBy,
          moduleNo: moduleIndex + 1,
          moduleTitle: currentModule.title,
          moduleDesc: currentModule.description,
          lessonNo: lessonIndex + 1,
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
          body: JSON.stringify(body)
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

        while (!done) {
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

        // Save generated content to DB
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
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson content');
      } finally {
        setContentLoading(false);
      }
    };

    // Only fetch if content doesn't exist for the current lesson
    if (!currentLesson.content) {
      fetchLessonContent();
    }
  }, [course, currentModule, currentLesson]);

  const handleLessonChange = (lesson: Lesson, module: Module) => {
    setCurrentLesson(lesson);
    setCurrentModule(module); // Ensure currentModule is set when a lesson is directly clicked
    router.push(`/courses/${courseId}/learn?module=${module.id}&lesson=${lesson.id}`);
    setIsMobileSidebarOpen(false); // Close mobile sidebar after selection
  };

  // const handleModuleClick = (module: Module) => {
  //   setCurrentModule(module);
  //   // When a module header is clicked, if it has lessons, navigate to the first one
  //   if (module.lessons?.length > 0) {
  //     handleLessonChange(module.lessons[0], module);
  //   } else {
  //     // If module has no lessons, just update the module and clear current lesson
  //     setCurrentLesson(null);
  //     router.push(`/courses/${courseId}/learn?module=${module.id}`);
  //   }
  // };

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

  if (loading) return <div className="flex justify-center p-8">Loading course...</div>;
  if (error) return <div className="flex justify-center p-8 text-red-500">{error}</div>;
  if (!course) return <div className="flex justify-center p-8">Course not found</div>;

  const sidebarContent = (
    <>
      <h3 className="font-semibold text-islamic-green dark:text-soft-blue mb-2">Course Modules</h3>
      <Accordion
        type="single"
        collapsible
        value={openModuleAccordion}
        onValueChange={setOpenModuleAccordion}
        className="w-full"
      >
        {course.modules?.map((module) => (
          <AccordionItem key={module.id} value={`module-${module.id}`}>
            <AccordionTrigger
              className={`p-2 rounded hover:no-underline ${currentModule?.id === module.id ? 'bg-islamic-green/10 dark:bg-soft-blue/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              //onClick={() => handleModuleClick(module)}
            >
              <div className="flex flex-col text-left">
                <div className="font-medium">{module.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {module.lessons?.length} lessons • {module.durationHours} hours
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-0">
              {/* Only render lessons for the currently selected module AND if the module is open */}
              {openModuleAccordion === `module-${module.id}` && (
                <div className="pl-4 py-2 space-y-1">
                  <h4 className="font-semibold text-islamic-green dark:text-soft-blue mb-2">Lessons</h4>
                  {module.lessons?.map((lesson) => (
                    <div
                      key={lesson.id}
                      className={`p-2 rounded cursor-pointer flex items-center ${currentLesson?.id === lesson.id ? 'bg-islamic-green/10 dark:bg-soft-blue/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      onClick={() => handleLessonChange(lesson, module)}
                    >
                      <div className={`w-4 h-4 rounded-full mr-2 ${currentLesson?.id === lesson.id ? 'bg-islamic-green dark:bg-soft-blue' : 'border border-gray-400'}`} />
                      <span>{lesson.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );

  return (
    <div className="flex flex-col min-h-screen bg-parchment dark:bg-dark-gray">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-parchment dark:bg-dark-gray border-b border-islamic-green/20 dark:border-soft-blue/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            {/* Mobile Sidebar Toggle (Sheet) */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
              <SheetTrigger asChild className="lg:hidden mr-4">
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 overflow-y-auto bg-parchment dark:bg-dark-gray">
                <SheetHeader>
                  <SheetTitle className="text-islamic-green dark:text-soft-blue">Course Navigation</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  {sidebarContent}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Sidebar Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
              className="hidden lg:flex mr-4 text-islamic-green dark:text-soft-blue border-islamic-green/20 dark:border-soft-blue/20"
            >
              {isDesktopSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>

            <Link href={`/courses/${courseId}`} className="text-islamic-green dark:text-soft-blue hover:underline">
              <ChevronLeft className="inline mr-1" /> Back to course
            </Link>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 hidden sm:block"> {/* Hidden on small screens */}
            {course.title}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-islamic-green dark:text-soft-blue border-islamic-green/20 dark:border-soft-blue/20"
          >
            {theme === "dark" ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 pt-16 pb-16"> {/* Adjusted padding-bottom to account for fixed footer */}
        {/* Desktop Sidebar */}
        <aside className={`fixed top-16 left-0 bottom-0 border-r border-islamic-green/20 dark:border-soft-blue/20 p-4 overflow-y-auto bg-parchment dark:bg-dark-gray z-40 transition-all duration-300 ${isDesktopSidebarOpen ? 'w-64 lg:block' : 'w-0 hidden'}`}>
          {sidebarContent}
        </aside>

        {/* Main Content */}
        <main className={`flex-1 p-6 overflow-y-auto transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
          {contentLoading ? (
            <div className="flex justify-center p-8">Loading lesson content...</div>
          ) : <></>}
          {currentLesson ? (
            <div className="max-w-20xl mx-auto">
              {/* Lesson Content */}
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer isGenerated={contentLoading} content={currentLesson.content || (!contentLoading ? 'No content available for this lesson.' : '')} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Select a lesson to view content</p>
            </div>
          )}
        </main>
      </div>

      {/* Fixed Footer for Navigation */}
      <footer className={`fixed bottom-0 left-0 right-0 z-50 bg-parchment dark:bg-dark-gray border-t border-islamic-green/20 dark:border-soft-blue/20 p-4 transition-all duration-300 ${isDesktopSidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <div className="container mx-auto flex justify-between items-center">
          <Button
            variant="link"
            onClick={() => {
              if (prevLessonData) {
                handleLessonChange(prevLessonData.lesson, prevLessonData.module);
              }
            }}
            disabled={!prevLessonData}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> {prevLessonData?.lesson.title || 'Previous'}
          </Button>
          <Button
            variant="link" className="text-islamic-green dark:text-soft-blue hover:underline"
            onClick={() => {
              if (nextLessonData) {
                handleLessonChange(nextLessonData.lesson, nextLessonData.module);
              }
            }}
            disabled={!nextLessonData}
          >
            {nextLessonData?.lesson.title || 'Next'} <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  )
}