// app/courses/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Loader2, BookOpen, Clock, Zap, Target, CheckCircle, Lightbulb, User, Star } from 'lucide-react' // Added more icons
import { LearningObjective, Lesson, Module, SkillGained, Course } from '@/types/course'
import AppLayout from '@/components/AppLayout' // Assuming AppLayout provides header/footer
import { languageMap } from '@/types/language'
import Link from 'next/link'

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
    // Add AbortController to handle potential unmounting or rapid navigation
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchCourse = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/courses/${courseId}`, { signal });
        if (signal.aborted) {
            console.log('Fetch aborted for course detail.');
            return;
        }
        if (!response.ok) {
            throw new Error('Failed to fetch course');
        }

        const data = await response.json();
        setCourse(data);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            console.log('Course detail fetch aborted.');
            return;
        }
        setError(err instanceof Error ? err.message : 'Failed to fetch course');
      } finally {
        if (!signal.aborted) {
            setLoading(false);
        }
      }
    }

    fetchCourse();

    return () => {
        controller.abort(); // Cleanup: abort any ongoing fetch on unmount or re-run
    };
  }, [courseId]);

  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  // Common loading, error, not found states
  if (loading) {
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-islamic-green dark:text-soft-blue" />
        <p className="ml-4 text-gray-700 dark:text-gray-300 text-lg">Loading course details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <div className="text-center p-8 max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-red-200 dark:border-red-700">
          <h2 className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-4">Oops! Something Went Wrong.</h2>
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

  if (!course) {
    return (
      <div className="min-h-screen bg-parchment dark:bg-dark-gray flex items-center justify-center">
        <div className="text-center p-8 max-w-lg bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-yellow-200 dark:border-yellow-700">
          <h2 className="text-3xl font-extrabold text-yellow-600 dark:text-yellow-400 mb-4">Course Not Found</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6 text-lg">The course you are looking for does not exist or has been removed.</p>
          <Button
            onClick={() => router.push('/')}
            className="bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90 text-white font-semibold py-2 px-6 rounded-md transition-colors duration-200"
          >
            Go to Search Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="bg-parchment dark:bg-dark-gray text-gray-900 dark:text-white min-h-screen">
        <div className="container mx-auto px-4 py-12 lg:py-16 max-w-6xl">
          {/* Breadcrumbs (Optional but good for UX) */}
          <nav className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            <Link href="/" className="hover:underline text-islamic-green dark:text-soft-blue">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/courses" className="hover:underline text-islamic-green dark:text-soft-blue">Courses</Link>
            <span className="mx-2">/</span>
            <span className="text-gray-500 dark:text-gray-400">{course.title}</span>
          </nav>

          {/* Hero Section: Course Header & Overview */}
          <section className="bg-gradient-to-r from-islamic-green/10 to-islamic-green/5 dark:from-soft-blue/10 dark:to-soft-blue/5 rounded-2xl shadow-xl p-6 md:p-10 mb-10 border border-islamic-green/30 dark:border-soft-blue/30 relative overflow-hidden">
            {/* Background elements for visual interest */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-islamic-green/5 dark:bg-soft-blue/5 rounded-full -mt-24 -mr-24 blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-islamic-green/5 dark:bg-soft-blue/5 rounded-full -mb-16 -ml-16 blur-3xl opacity-50"></div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex-1">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${getDifficultyColor(course.difficultyLevel)} capitalize mb-3 inline-block shadow-sm`}>
                  {course.difficultyLevel}
                </span>
                <h1 className="text-4xl lg:text-5xl font-extrabold text-islamic-green dark:text-soft-blue leading-tight mb-4">
                  {course.title}
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 max-w-3xl">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-gray-700 dark:text-gray-300 mb-8">
                    <span className="flex items-center text-sm font-medium">
                        <Clock className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
                        {Math.ceil(course.totalDuration / 24)} weeks
                    </span>
                    <span className="flex items-center text-sm font-medium">
                        <BookOpen className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
                        {course.totalDuration} hours total
                    </span>
                    <span className="flex items-center text-sm font-medium">
                        <User className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
                        Verified by {course.verifiedBy}
                    </span>
                    <span className="flex items-center text-sm font-medium">
                        <Lightbulb className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
                        Language: {languageMap[course.language]}
                    </span>
                </div>

                <Button
                  onClick={() => router.push(`/courses/${course.id}/learn`)}
                  className="px-8 py-3 text-lg font-semibold rounded-full bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Start Learning Now
                </Button>
              </div>
              {/* Optional: Course Image/Illustration */}
              {/* <div className="flex-shrink-0 lg:w-96 w-full mt-8 lg:mt-0">
                  <Image
                      src="/path/to/your/course-image.jpg" // Replace with actual image path
                      alt="Course illustration"
                      width={400}
                      height={300}
                      className="rounded-xl shadow-2xl object-cover w-full h-auto"
                  />
              </div> */}
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* What You'll Learn */}
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-5 flex items-center">
                  <Target className="h-6 w-6 mr-3" />
                  What You&apos;ll Learn
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {course.learningObjectives.map((objective, index) => (
                    <li key={index} className="flex items-start text-gray-700 dark:text-gray-300">
                      <CheckCircle className="h-5 w-5 text-islamic-green dark:text-soft-blue mt-1 mr-2 flex-shrink-0" />
                      <span>{objective.objective}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Course Curriculum */}
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-5 flex items-center">
                  <BookOpen className="h-6 w-6 mr-3" />
                  Course Curriculum
                </h2>
                <Accordion type="single" collapsible className="w-full">
                  {course.modules.map((module, moduleIndex) => (
                    <AccordionItem
                      key={moduleIndex}
                      value={`module-${moduleIndex}`}
                      className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                    >
                      <AccordionTrigger className="hover:no-underline text-lg font-semibold text-gray-800 dark:text-white py-4 px-2">
                        <div className="flex flex-col items-start w-full">
                          <span className="text-sm font-medium text-islamic-green dark:text-soft-blue mb-1">
                            Module {moduleIndex + 1}
                          </span>
                          <h3 className="font-bold text-left">
                            {module.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-left mt-1">
                            <Clock className="h-4 w-4 inline-block mr-1 -mt-0.5" />
                            {module.durationHours} hours • {module.lessons.length} lessons
                          </p>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 pt-2">
                        <ul className="space-y-3 pl-6">
                          {module.lessons.map((lesson, lessonIndex) => (
                            <li key={lessonIndex} className="flex items-start text-gray-700 dark:text-gray-300">
                              <Lightbulb className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-1 mr-2 flex-shrink-0" />
                              <span>{lesson.title}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>

              {/* Skills Gained Section (Optional: as a separate section) */}
              <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-5 flex items-center">
                  <Zap className="h-6 w-6 mr-3" />
                  Skills You&apos;ll Gain
                </h2>
                <div className="flex flex-wrap gap-3">
                  {course.skillsGained.map((skill, index) => (
                    <span
                      key={index}
                      className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-4 py-2 rounded-full font-medium shadow-sm"
                    >
                      {skill.skill}
                    </span>
                  ))}
                </div>
              </section>

                {/* Prerequisites (if not empty) */}
                {/* {course.prerequisites && course.prerequisites.length > 0 && (
                    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-5 flex items-center">
                            <Lightbulb className="h-6 w-6 mr-3" />
                            Prerequisites
                        </h2>
                        <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                            {course.prerequisites.map((req, index) => (
                                <li key={index}>{req}</li>
                            ))}
                        </ul>
                    </section>
                )} */}
            </div>

            {/* Right Column - Fixed/Sticky Sidebar with Key Info & Action */}
            <aside className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:p-8 border border-gray-200 dark:border-gray-700 sticky top-24 lg:top-32 space-y-6"> {/* Adjusted top for sticky */}
                <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue mb-4">
                  Course At a Glance
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center"><Clock className="h-5 w-5 mr-2 text-islamic-green dark:text-soft-blue" /> Duration:</span>
                    <span className="text-gray-600 dark:text-gray-400">{course.totalDuration} hours ({Math.ceil(course.totalDuration / 24)} weeks)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center"><Zap className="h-5 w-5 mr-2 text-islamic-green dark:text-soft-blue" /> Level:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${getDifficultyColor(course.difficultyLevel)}`}>
                        {course.difficultyLevel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center"><User className="h-5 w-5 mr-2 text-islamic-green dark:text-soft-blue" /> Provider:</span>
                    <span className="text-gray-600 dark:text-gray-400 text-sm">{course.verifiedBy}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center"><Lightbulb className="h-5 w-5 mr-2 text-islamic-green dark:text-soft-blue" /> Language:</span>
                    <span className="text-gray-600 dark:text-gray-400">{languageMap[course.language]}</span>
                  </div>
                  <div className="flex items-center justify-between py-2"> {/* No border-b for the last item in summary */}
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center"><Clock className="h-5 w-5 mr-2 text-islamic-green dark:text-soft-blue" /> Last Updated:</span>
                    <span className="text-gray-600 dark:text-gray-400">{new Date(course.updatedAt || course.createdAt || '').toLocaleDateString()}</span>
                  </div>
                </div>

                <Button
                  onClick={() => router.push(`/courses/${course.id}/learn`)}
                  className="w-full mt-6 px-8 py-3 text-lg font-semibold rounded-full bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  Enroll Now
                </Button>

                {/* Optional: Call to action for sharing or bookmarking */}
                <div className="text-center mt-6 text-gray-600 dark:text-gray-400 text-sm">
                    <p>Share this course or add it to your bookmarks!</p>
                </div>
              </div>
            </aside>
          </div>

          {/* Optional: Related Courses Section */}
          <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-islamic-green dark:text-soft-blue mb-8 text-center">
              You might also like...
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Mock related course cards (replace with actual data/component) */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Another Related Course</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">A brief description of another course that is similar or complementary.</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" fill="currentColor"/> 4.8 (120 reviews)
                    <span className="ml-auto">Intermediate</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Advanced Topic Deep Dive</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">Explore advanced concepts in this intensive, short course.</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" fill="currentColor"/> 4.5 (90 reviews)
                    <span className="ml-auto">Advanced</span>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-200 cursor-pointer">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400 mb-2">Beginner&apos;s Guide to X</h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-3">Start your journey with this foundational course for beginners.</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" fill="currentColor"/> 4.9 (210 reviews)
                    <span className="ml-auto">Beginner</span>
                </div>
              </div>
            </div>
          </section>

          {/* Optional: Testimonials Section */}
          <section className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-islamic-green dark:text-soft-blue mb-8 text-center">
              What Our Learners Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Mock Testimonial 1 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  {/* <Image
                    src="https://via.placeholder.com/50" // Placeholder image
                    alt="User Avatar"
                    width={50}
                    height={50}
                    className="rounded-full mr-4"
                  /> */}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Jane Doe</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Software Engineer</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  &quot;This course was an absolute game-changer! The curriculum is well-structured, and the explanations are incredibly clear. Highly recommend!&quot;
                </p>
                <div className="flex mt-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500" fill="currentColor"/>
                  ))}
                </div>
              </div>
              {/* Mock Testimonial 2 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  {/* <Image
                    src="https://via.placeholder.com/50" // Placeholder image
                    alt="User Avatar"
                    width={50}
                    height={50}
                    className="rounded-full mr-4"
                  /> */}
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">John Smith</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Data Scientist</p>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  &quot;I learned so much from this course. The practical exercises were invaluable, and I feel much more confident in my skills now.&quot;
                </p>
                <div className="flex mt-3">
                  {[...Array(4)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500" fill="currentColor"/>
                  ))}
                   <Star className="h-5 w-5 text-gray-300 dark:text-gray-600" /> {/* Half star or empty star */}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </AppLayout>
  )
}