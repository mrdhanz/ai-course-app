// app/courses/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2 } from 'lucide-react'
import { LearningObjective, Lesson, Module, SkillGained, Course } from '@/types/course'
import AppLayout from '@/components/AppLayout'
import { languageMap } from '@/types/language'

interface CourseDetail extends Omit<Course, 'learningObjectives' | 'skillsGained' | 'modules'> {
  learningObjectives: LearningObjective[]
  skillsGained: SkillGained[]
  modules: (Omit<Module, 'lessons'> & { lessons: Lesson[] })[]
}

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter();

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/courses/${courseId}`)
        if (!response.ok) throw new Error('Failed to fetch course')

        const data = await response.json()
        setCourse(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch course')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [courseId])

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-islamic-green dark:text-soft-blue" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-4">Error Loading Course</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-4">Course Not Found</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">The requested course could not be found.</p>
          <Button
            onClick={() => router.push('/courses')}
            className="bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90"
          >
            Browse Courses
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-parchment dark:bg-dark-gray">
        <div className="container mx-auto px-4 py-8">
          {/* Course Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border border-islamic-green/20 dark:border-soft-blue/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(course.difficultyLevel)} mb-2 inline-block`}>
                  {course.difficultyLevel}
                </span>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {course.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Verified by {course.verifiedBy}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <div className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-1">
                  {Math.ceil(course.totalDuration / 24)} weeks
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {languageMap[course.language]} • {course.totalDuration} hours
                </div>
              </div>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {course.description}
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {course.skillsGained.map((skill, index) => (
                <span
                  key={index}
                  className="text-sm bg-islamic-green/10 dark:bg-soft-blue/10 text-islamic-green dark:text-soft-blue px-3 py-1 rounded-full"
                >
                  {skill.skill}
                </span>
              ))}
            </div>

            <Button
              onClick={() => router.push(`/courses/${courseId}/learn`)}
              className="w-full md:w-auto bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90">
              Learn Now
            </Button>
          </div>

          {/* Course Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Learning Objectives */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-islamic-green/20 dark:border-soft-blue/20">
                <h2 className="text-xl font-bold text-islamic-green dark:text-soft-blue mb-4">
                  What You&apos;ll Learn
                </h2>
                <ul className="space-y-3">
                  {course.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-islamic-green dark:text-soft-blue mt-0.5 mr-2 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-gray-700 dark:text-gray-300">
                        {objective.objective}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Course Curriculum */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-islamic-green/20 dark:border-soft-blue/20">
                <h2 className="text-xl font-bold text-islamic-green dark:text-soft-blue mb-4">
                  Course Curriculum
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {course.modules.map((module, moduleIndex) => (
                    <AccordionItem key={moduleIndex} value={`module-${moduleIndex}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div>
                            <h3 className="text-lg font-medium text-left">
                              Module {moduleIndex + 1}: {module.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-left">
                              {module.durationHours} hours • {module.lessons.length} lessons
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pl-2 mt-2">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <div key={lessonIndex} className="flex items-start">
                              <svg
                                className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5 mr-2 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <div>
                                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                                  {lesson.title}
                                </h4>
                                {/* {lesson.content && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                  {lesson.content}
                                </p>
                              )} */}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>

            {/* Right Column - Course Details */}
            <div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-islamic-green/20 dark:border-soft-blue/20 sticky top-4">
                <h2 className="text-xl font-bold text-islamic-green dark:text-soft-blue mb-4">
                  Course Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Language
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {languageMap[course.language]}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Difficulty Level
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {course.difficultyLevel}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Total Duration
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {course.totalDuration} hours ({Math.ceil(course.totalDuration / 24)} weeks)
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Verification
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {course.verifiedBy}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Updated
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {new Date(course.updatedAt || course.createdAt || '').toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => router.push(`/courses/${courseId}/learn`)}
                  className="w-full mt-6 bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90">
                  Learn Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}