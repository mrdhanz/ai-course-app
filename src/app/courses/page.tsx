// app/courses/page.tsx
'use client'

import { useEffect } from 'react';
import { useCourseStore } from '@/store/course-store';
import { CourseCard } from '@/components/CourseCard';
import { Pagination } from '@/components/Pagination';
import { FilterBar } from '@/components/FilterBar';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { EmptyState } from '@/components/EmptyState';
import AppLayout from '@/components/AppLayout';

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

    // Fetch courses when any parameter changes
    useEffect(() => {
        fetchCourses();
    }, [pagination.page, pagination.limit, filters.lang, filters.difficulty, filters.search, sort.field, sort.order, fetchCourses]);

    return (
        <AppLayout>
            <div className="min-h-screen bg-parchment dark:bg-dark-gray">
                <div className="container mx-auto px-4 py-8">
                    <h1 className="text-3xl font-bold text-islamic-green dark:text-soft-blue mb-8">
                        Available Courses
                    </h1>

                    {/* Filter and Sort Bar */}
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

                    {/* Error State */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: pagination.limit }).map((_, i) => (
                                <SkeletonLoader key={i} />
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!loading && courses.length === 0 && (
                        <EmptyState
                            title="No courses found"
                            description="Try adjusting your filters or search query"
                            subject={filters.search}
                        />
                    )}

                    {/* Course Grid */}
                    {!loading && courses.length > 0 && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                                {courses.map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>

                            {/* Pagination */}
                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
                                onPageChange={setPage}
                                limit={pagination.limit}
                                onLimitChange={setLimit}
                            />
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}