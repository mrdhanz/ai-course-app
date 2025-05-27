// components/CourseCard.tsx
'use client'

import Link from 'next/link';
import { ExploreCourse } from '@/types/course-explore';
import { languageMap } from '@/types/language';
import { BookOpen, Clock, Zap, User } from 'lucide-react'; // Import additional icons
//import Image from 'next/image'; // For potential course image

interface CourseCardProps {
  course: ExploreCourse;
}

export function CourseCard({ course }: CourseCardProps) {
  // Assuming 1 week = 24 hours of study for "effective" weeks
  const getDurationWeeks = (hours: number) => Math.ceil(hours / 24); 
  
  const getDifficultyColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  // Fallback image if course doesn't have one
 // const courseImage = course.imageUrl || `https://via.placeholder.com/400x200/4CAF50/FFFFFF?text=${encodeURIComponent(course.title.split(' ').slice(0,2).join(' '))}`;

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700 cursor-pointer">
      <Link href={`/courses/${course.id}`} className="block">
        {/* Course Image or Placeholder */}
        <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {/* <Image
            src={courseImage}
            alt={`Cover image for ${course.title}`}
            width={400}
            height={200}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Fallback to a simpler placeholder if image fails to load
              e.currentTarget.src = `https://via.placeholder.com/400x200/4CAF50/FFFFFF?text=${encodeURIComponent(course.title.split(' ').slice(0,2).join(' '))}`;
            }}
          /> */}
          {/* Difficulty Level as a badge on the image */}
          <span className={`absolute top-3 right-3 text-xs px-3 py-1 rounded-full font-semibold capitalize ${getDifficultyColor(course.difficultyLevel)} shadow-sm`}>
            {course.difficultyLevel}
          </span>
        </div>

        <div className="p-5 flex flex-col flex-grow">
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-islamic-green dark:group-hover:text-soft-blue transition-colors duration-200">
            {course.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3 flex-grow">
            {course.description}
          </p>

          {/* Key Info Chips/Tags (Duration, Language, Verified By) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-700 dark:text-gray-300 mb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
              {getDurationWeeks(course.totalDuration)} weeks
            </span>
            <span className="flex items-center">
              <BookOpen className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
              {course.totalDuration} hrs
            </span>
            <span className="flex items-center">
              <User className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
              {course.verifiedBy}
            </span>
            <span className="flex items-center">
              <Zap className="h-4 w-4 mr-1 text-islamic-green dark:text-soft-blue" />
              {languageMap[course.language]}
            </span>
          </div>

          {/* Skills Gained */}
          <div className="mt-auto"> {/* Pushes skills to the bottom */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Skills you&apos;ll gain:</p>
            <div className="flex flex-wrap gap-2">
              {course.skillsGained.slice(0, 3).map((skill) => (
                <span
                  key={skill.id}
                  className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-medium" // Rounded full for more pill-like
                >
                  {skill.skill}
                </span>
              ))}
              {course.skillsGained.length > 3 && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-3 py-1 rounded-full font-medium">
                  +{course.skillsGained.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}