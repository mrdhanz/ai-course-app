// app/courses/[courseId]/learn/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Course, Lesson, Module } from '@/types/course'
import { useTheme } from 'next-themes'
import dynamic from "next/dynamic";
import { MarkdownRenderer } from '@/components/MarkdownRenderer'

const SunIcon = dynamic(() => import('@/components/SunIcon'), { ssr: false })
const MoonIcon = dynamic(() => import('@/components/MoonIcon'), { ssr: false })

interface GenerateContentRequest {
  level: string;
  verifiedBy: string;
  courseTitle: string;
  courseDesc: string;
  moduleTitle: string;
  moduleDesc: string;
  lessonTitle: string;
  lang: string;
  format: string;
}

export default function CourseLearnPage() {
  const { theme, setTheme } = useTheme();
  const { courseId } = useParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [currentModule, setCurrentModule] = useState<Module | null>(null)
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
          setCurrentModule(data.modules[0])
          if (data.modules[0].lessons?.length > 0) {
            setCurrentLesson(data.modules[0].lessons[0])
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

        const body: GenerateContentRequest = {
          courseTitle: course.title,
          courseDesc: course.description,
          verifiedBy: course.verifiedBy,
          moduleTitle: currentModule.title,
          moduleDesc: currentModule.description,
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
      <header className="border-b border-islamic-green/20 dark:border-soft-blue/20 p-4">
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

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r border-islamic-green/20 dark:border-soft-blue/20 p-4 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-semibold text-islamic-green dark:text-soft-blue mb-2">Course Modules</h3>
            <div className="space-y-1">
              {course.modules?.map((module) => (
                <div
                  key={module.id}
                  className={`p-2 rounded cursor-pointer ${currentModule?.id === module.id ? 'bg-islamic-green/10 dark:bg-soft-blue/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  onClick={() => {
                    setCurrentModule(module)
                    if (module.lessons?.length > 0) {
                      handleLessonChange(module.lessons[0])
                    }
                  }}
                >
                  <div className="font-medium">{module.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {module.lessons?.length} lessons • {module.durationHours} hours
                  </div>
                </div>
              ))}
            </div>
          </div>

          {currentModule && (
            <div>
              <h4 className="font-semibold text-islamic-green dark:text-soft-blue mb-2">Lessons</h4>
              <div className="space-y-1">
                {currentModule.lessons?.map((lesson) => (
                  <div
                    key={lesson.id}
                    className={`p-2 rounded cursor-pointer ${currentLesson?.id === lesson.id ? 'bg-islamic-green/10 dark:bg-soft-blue/10' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    onClick={() => handleLessonChange(lesson)}
                  >
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full mr-2 ${currentLesson?.id === lesson.id ? 'bg-islamic-green dark:bg-soft-blue' : 'border border-gray-400'}`} />
                      <span>{lesson.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {contentLoading ? (
            <div className="flex justify-center p-8">Loading lesson content...</div>
          ) :<></> }
          {currentLesson ? (
            <div className="max-w-3xl mx-auto">
              {/* Lesson Content */}
              <div className="prose dark:prose-invert max-w-none">
                <MarkdownRenderer isGenerated={contentLoading} content={currentLesson.content || (!contentLoading ? 'No content available for this lesson.' : '')}/>
              </div>

              {/* Navigation */}
              <div className="flex justify-between mt-8">
                <Button variant="outline">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button className="bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90">
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
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