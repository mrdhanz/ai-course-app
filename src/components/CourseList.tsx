import Link from 'next/link'

interface Course {
  id: string
  title: string
  description: string
  language: string
  difficultyLevel: string
  verifiedBy: string
  totalDuration: number
  skillsGained: Array<{ id: string; skill: string }>
}

interface CourseListProps {
  courses: Course[]
}

export function CourseList({ courses }: CourseListProps) {
  // Convert total duration (in hours) to weeks (assuming 12 hours per week)
  const getDurationWeeks = (hours: number) => Math.ceil(hours / 12)
  
  // Get difficulty level color
  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {courses.map((course) => (
          <div 
            key={course.id}
            className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 dark:border-gray-700"
          >
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(course.difficultyLevel)}`}>
                  {course.difficultyLevel}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {getDurationWeeks(course.totalDuration)} weeks
                </span>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                <Link href={`/courses/${course.id}`} className="hover:text-islamic-green dark:hover:text-soft-blue">
                  {course.title}
                </Link>
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-3">
                {course.description}
              </p>

              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Skills you'll gain:</p>
                <div className="flex flex-wrap gap-1">
                  {course.skillsGained.slice(0, 3).map((skill) => (
                    <span 
                      key={skill.id} 
                      className="text-xs bg-islamic-green/10 dark:bg-soft-blue/10 text-islamic-green dark:text-soft-blue px-2 py-1 rounded"
                    >
                      {skill.skill}
                    </span>
                  ))}
                  {course.skillsGained.length > 3 && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded">
                      +{course.skillsGained.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{course.language}</span>
                <span>Verified by {course.verifiedBy}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}