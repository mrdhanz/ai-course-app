// app/courses/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'; // Added useRef for scroll to top
import { useCourseStore } from '@/store/course-store';
import { CourseCard } from '@/components/CourseCard'; // Assuming CourseCard is enhanced
import { Pagination } from '@/components/Pagination'; // Assuming Pagination is enhanced
import { FilterBar } from '@/components/FilterBar'; // Assuming FilterBar is enhanced
import { SkeletonLoader } from '@/components/SkeletonLoader'; // Assuming SkeletonLoader is enhanced
import { EmptyState } from '@/components/EmptyState'; // Assuming EmptyState is enhanced
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button'; // Assuming you have Button
import { ArrowUp } from 'lucide-react'; // For scroll to top button

export default function CoursesPage() {
    const {
        courses,
        loading,
        error,
        pagination,
        filters,
        sort,
        fetchCourses,
        setPage,
        setLimit,
        setDifficultyFilter,
        setLanguageFilter,
        setSearchFilter,
        setSort,
    } = useCourseStore();

    const [showScrollToTop, setShowScrollToTop] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null); // Ref for the main content area

    // Fetch courses when any parameter changes
    useEffect(() => {
        fetchCourses();
        // Scroll to the top of the content area when filters/pagination change
        if (contentRef.current) {
            contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [pagination.page, pagination.limit, filters.lang, filters.difficulty, filters.search, sort.field, sort.order, fetchCourses]);

    // Handle scroll to top button visibility
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) { // Show button after scrolling 300px
                setShowScrollToTop(true);
            } else {
                setShowScrollToTop(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-parchment dark:bg-dark-gray flex flex-col">
                {/* Hero Section / Page Header */}
                <header className="bg-gradient-to-r from-islamic-green/10 to-islamic-green/5 dark:from-soft-blue/10 dark:to-soft-blue/5 py-12 mb-8 shadow-inner relative overflow-hidden">
                    {/* Subtle background shapes for visual interest */}
                    <div className="absolute inset-0 z-0 opacity-50">
                        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                            <circle cx="20" cy="80" r="15" fill="currentColor" className="text-islamic-green/10 dark:text-soft-blue/10 animate-pulse-slow" />
                            <circle cx="80" cy="20" r="10" fill="currentColor" className="text-islamic-green/10 dark:text-soft-blue/10 animate-pulse-slow delay-200" />
                            <rect x="50" y="50" width="20" height="20" rx="5" ry="5" fill="currentColor" className="text-islamic-green/10 dark:text-soft-blue/10 animate-pulse-slow delay-400" />
                        </svg>
                    </div>
                    <div className="container mx-auto px-4 relative z-10 text-center">
                        <h1 className="text-4xl md:text-5xl font-extrabold text-islamic-green dark:text-soft-blue leading-tight mb-4 drop-shadow-md">
                            Explore Our Course Catalog
                        </h1>
                        <p className="text-lg md:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
                            Discover a wide range of courses tailored to your learning journey.
                            From beginner basics to advanced topics, find your next skill.
                        </p>
                    </div>
                </header>

                <div ref={contentRef} className="container mx-auto px-4 py-8 flex-1">
                    {/* Filter and Sort Bar */}
                    <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <FilterBar
                            searchValue={filters.search}
                            difficultyValue={filters.difficulty}
                            languageValue={filters.lang}
                            sortField={sort.field}
                            sortOrder={sort.order}
                            onSearchChange={setSearchFilter}
                            onDifficultyChange={setDifficultyFilter}
                            onLanguageChange={setLanguageFilter}
                            onSortChange={setSort}
                        />
                    </div>

                    {/* Conditional States */}
                    {error && (
                        <div className="mb-6 p-6 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg shadow-sm text-center border border-red-200 dark:border-red-700">
                            <h2 className="text-xl font-semibold mb-2">Error Loading Courses</h2>
                            <p>{error}</p>
                            <Button
                                onClick={() => window.location.reload()}
                                className="mt-4 bg-red-500 hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 text-white"
                            >
                                Reload Page
                            </Button>
                        </div>
                    )}

                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: pagination.limit }).map((_, i) => (
                                <SkeletonLoader key={i} />
                            ))}
                        </div>
                    )}

                    {!loading && courses.length === 0 && !error && (
                        <EmptyState
                            title="No courses found for your selection"
                            description="Try clearing some filters or broadening your search query."
                            subject={filters.search} // Pass search term for more context
                        />
                    )}

                    {/* Course Grid */}
                    {!loading && courses.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
                                {courses.map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-center mb-8">
                                <Pagination
                                    currentPage={pagination.page}
                                    totalPages={pagination.totalPages}
                                    onPageChange={setPage}
                                    limit={pagination.limit}
                                    onLimitChange={setLimit}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Scroll to Top Button */}
                {showScrollToTop && (
                    <Button
                        onClick={scrollToTop}
                        className="fixed bottom-6 right-6 p-3 rounded-full bg-islamic-green dark:bg-soft-blue text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50"
                        aria-label="Scroll to top"
                    >
                        <ArrowUp className="h-6 w-6" />
                    </Button>
                )}
            </div>
        </AppLayout>
    );
}