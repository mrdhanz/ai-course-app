// app/courses/[courseId]/learn/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
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
  const [course, setCourse] = useState<Course | null>(null)
  const [currentModule, setCurrentModule] = useState<Module | null>(null)
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // State for controlling the open module in the accordion
  const [openModuleAccordion, setOpenModuleAccordion] = useState<string | undefined>('module-' + params.get('module') || undefined);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/courses/${courseId}`)
        if (!res.ok) throw new Error('Failed to fetch course')
        const data = await res.json()
        setCourse(data)

        // Set initial module and lesson
        if (data.modules?.length > 0) {
          const initialModule = data.modules[0];
          setCurrentModule(initialModule)
          setOpenModuleAccordion(`module-${initialModule.id}`); // Open the first module by default
          if (initialModule.lessons?.length > 0) {
            setCurrentLesson(initialModule.lessons[0])
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch course')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [courseId])

  useEffect(() => {
    if (!course || !currentModule || !currentLesson) return

    const fetchLessonContent = async () => {
      try {
        setContentLoading(true)
        setError(null)

        const moduleIndex = course.modules.findIndex(m => m.id === currentModule.id)
        if (moduleIndex === -1) return
        const lessonIndex = course.modules[moduleIndex].lessons.findIndex(m => m.id === currentLesson.id)
        if (lessonIndex === -1) return
        
        if (currentModule?.id && currentLesson?.id) {
          try {
            const res = await fetch(`/api/courses/${course.id}/${currentModule.id}/${currentLesson.id}`, {
              headers: {
                'Content-Type': 'application/json',
              }
            })
            if(res.ok){
              const lesson = await res.json() as Lesson
              if(lesson.content){
                setCurrentLesson(lesson)
                return;
              }
            }
          } catch (er){
            console.error(er)
          }
        }

        const body: GenerateContentRequest = {
          courseTitle: course.title,
          courseDesc: course.description,
          verifiedBy: course.verifiedBy,
          moduleNo: moduleIndex+1,
          moduleTitle: currentModule.title,
          moduleDesc: currentModule.description,
          lessonNo: lessonIndex+1,
          lessonTitle: currentLesson.title,
          level: course.difficultyLevel,
          lang: course.language,
          format: 'markdown'
        }

        const res = await fetch('/api/ai/course/content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        })
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to generate content');
        }

        // Read the streamed res
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
          }))
        }

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
          })
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lesson content')
      } finally {
        setContentLoading(false)
      }
    }

    // Only fetch if content doesn't exist
    if (!currentLesson.content) {
      fetchLessonContent()
    }
  }, [course, currentModule, currentLesson])

  const handleLessonChange = (lesson: Lesson) => {
    setCurrentLesson(lesson)
  }

  if (loading) return <div className="flex justify-center p-8">Loading course...</div>
  if (error) return <div className="flex justify-center p-8 text-red-500">{error}</div>
  if (!course) return <div className="flex justify-center p-8">Course not found</div>

  return (
    <div className="flex flex-col min-h-screen bg-parchment dark:bg-dark-gray">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-parchment dark:bg-dark-gray border-b border-islamic-green/20 dark:border-soft-blue/20 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href={`/courses/${courseId}`} className="text-islamic-green dark:text-soft-blue hover:underline">
            <ChevronLeft className="inline mr-1" /> Back to course
          </Link>
          <div className="text-sm text-gray-600 dark:text-gray-400">
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

      <div className="flex flex-1 pt-16"> {/* Add pt-16 to main content to offset fixed header */}
        {/* Sidebar */}
        <aside className="fixed top-16 left-0 bottom-0 w-64 border-r border-islamic-green/20 dark:border-soft-blue/20 p-4 overflow-y-auto bg-parchment dark:bg-dark-gray z-40">
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
                  // Removed onClick from here to let AccordionTrigger handle the open/close
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
                          onClick={() => {
                            setCurrentModule(module); // Ensure the module is set if a lesson is clicked directly
                            handleLessonChange(lesson);
                            router.push(`/courses/${courseId}/learn?module=${module.id}&lesson=${lesson.id}`)
                          }}
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
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 p-6 overflow-y-auto"> {/* Add ml-64 to main content to offset fixed sidebar */}
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
    </div>
  )
}