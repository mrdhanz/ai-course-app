// app/search/page.tsx
"use client";

import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CourseSuggestion, CourseSuggestionsResponse } from "@/types/course-suggestion";
import { Loader2, Search as SearchIcon } from 'lucide-react';
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dynamic from "next/dynamic";

const SunIcon = dynamic(() => import('@/components/SunIcon'), { ssr: false })
const MoonIcon = dynamic(() => import('@/components/MoonIcon'), { ssr: false })

// --- History Utility Functions (Can be in a separate file like `src/lib/search-history.ts`) ---
const HISTORY_KEY = "course_search_history";
const MAX_HISTORY_ITEMS = 5; // Limit user history suggestions displayed

const loadSearchHistory = (): string[] => {
    if (typeof window !== 'undefined') {
        try {
            const history = localStorage.getItem(HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error("Failed to parse search history from localStorage", e);
            return [];
        }
    }
    return [];
};

const saveSearchHistory = (newSearch: string) => {
    if (typeof window !== 'undefined' && newSearch.trim() !== "") {
        try {
            let history = loadSearchHistory();
            // Add new search to the beginning, ensure uniqueness
            history = [newSearch.trim(), ...history.filter(item => item.trim() !== newSearch.trim())];
            // Trim to max items
            history = history.slice(0, MAX_HISTORY_ITEMS);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save search history to localStorage", e);
        }
    }
};
// --- End History Utility Functions ---

function SearchResultsPage() {
    const params = useSearchParams();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGeneratingFullCourse, setIsGeneratingFullCourse] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<CourseSuggestion | null>(null);
    const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsContainerRef = useRef<HTMLDivElement>(null);

    // Ref to store the AbortController for handleGenerateFullCourse
    const generateCourseControllerRef = useRef<AbortController | null>(null);

    // Get search parameters from the URL
    const subject = params.get('subject') || "";
    const audience = params.get('audience') || "";
    const goals = params.get('goals') || "";
    const verifiedBy = params.get('verifiedBy') || "";
    const language = params.get('language') || "ID";
    // Initialize currentSearchTerm from URL subject
    useEffect(() => {
        setCurrentSearchTerm(subject);
    }, [subject]);

    const [currentSearchTerm, setCurrentSearchTerm] = useState(""); // For the persistent search bar

    // Debounced value for fetching suggestions to prevent excessive calls
    const [debouncedSubject, setDebouncedSubject] = useState(currentSearchTerm);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSubject(currentSearchTerm);
        }, 300); // Debounce delay

        return () => {
            clearTimeout(handler);
        };
    }, [currentSearchTerm]);

    // Effect for fetching suggestions (already has AbortController)
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        const fetchSuggestions = async () => {
            setIsLoading(true);
            setError(null);
            setSuggestions([]);

            if (subject.length < 1 || audience.length < 1) {
                router.push('/');
                return;
            }

            try {
                const payload = {
                    subject,
                    audience: audience || undefined,
                    goals: goals || undefined,
                    verifiedBy: verifiedBy || undefined,
                    language,
                };

                const response = await fetch('/api/ai/course/suggestions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                    signal: signal,
                });

                if (signal.aborted) {
                    console.log('Fetch aborted for new search query.');
                    return;
                }

                if (!response.ok) {
                    throw new Error('Failed to fetch suggestions');
                }

                const result: CourseSuggestionsResponse = await response.json();
                setSuggestions(result.suggestions);
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    console.log('Fetch request was cancelled.');
                    return;
                }
                console.error(err);
                setError("Failed to get course suggestions. Please try again.");
            } finally {
                if (!signal.aborted) {
                    setIsLoading(false);
                }
            }
        };

        fetchSuggestions();

        return () => {
            controller.abort();
        };
    }, [subject, audience, goals, verifiedBy, language, router]);

    // handleGenerateFullCourse now includes AbortController logic
    async function handleGenerateFullCourse(course: CourseSuggestion) {
        // If a previous request is ongoing, abort it first
        if (generateCourseControllerRef.current) {
            generateCourseControllerRef.current.abort();
            console.log('Previous full course generation request cancelled.');
        }

        const controller = new AbortController();
        const signal = controller.signal;
        generateCourseControllerRef.current = controller; // Store the new controller

        try {
            setSelectedCourse(course);
            setIsGeneratingFullCourse(true);
            setError(null);

            // First fetch: Generate course details
            const response = await fetch('/api/ai/course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    courseTitle: course.title,
                    verifiedBy: course.verifiedBy,
                    totalDuration: course.durationWeeks * 24,
                    level: course.difficulty,
                    lang: language,
                    keyTopics: course.keyTopics,
                    targetAudience: course.targetAudience,
                    prerequisites: course.prerequisites,
                    suggestions: true,
                }),
                signal: signal, // Pass signal to the first fetch
            });

            if (signal.aborted) {
                console.log('Full course generation (API call 1) was cancelled.');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to generate full course');
            }

            const result = await response.json();

            // Second fetch: Save course
            const res = await fetch('/api/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(result),
                signal: signal, // Pass signal to the second fetch
            });

            if (signal.aborted) {
                console.log('Full course generation (API call 2) was cancelled.');
                return;
            }

            if (!res.ok) {
                throw new Error('Failed to save course');
            }

            const newCourse = await res.json();
            router.push(`/courses/${newCourse.id}`);
        } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
                console.log('Full course generation request was aborted.');
                return; // Ignore AbortError
            }
            console.error(err);
            setError("Failed to generate full course details. Please try again.");
        } finally {
            // Only set loading to false if this specific request wasn't aborted
            // And clear the ref only if it's still pointing to the current controller
            if (!signal.aborted) {
                setIsGeneratingFullCourse(false);
                if (generateCourseControllerRef.current === controller) {
                    generateCourseControllerRef.current = null;
                }
            }
        }
    }

    // Function to get personalized history suggestions
    const fetchHistorySuggestions = useCallback((query: string): string[] => {
        const history = loadSearchHistory();
        return history.filter(item =>
            item.toLowerCase().includes(query.toLowerCase())
        );
    }, []);

    // Placeholder for fetching general course suggestions (now with AbortController)
    const fetchGeneralCourseSuggestions = useCallback(async (query: string, type: string, signal: AbortSignal): Promise<string[]> => {
        if (!query) return [];

        try {
            // Pass the AbortSignal to the fetch request
            const response = await fetch(`/api/ai/course/suggestions?q=${encodeURIComponent(query)}&type=${type}`, { signal });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API error fetching suggestions:", errorData.message);
                return [];
            }

            const data: string[] = await response.json();
            return data;
        } catch (error) {
            // Check if the error is due to abortion
            if (error instanceof Error && error.name === 'AbortError') {
                console.log('Fetch aborted:', query);
                return []; // Return empty array or handle as needed for cancelled requests
            }
            console.error("Network error fetching suggestions:", error);
            return [];
        }
    }, []);


    // Effect to fetch and combine suggestions based on debouncedSubject
    useEffect(() => {
        const controller = new AbortController(); // Create a new AbortController
        const signal = controller.signal; // Get its signal

        const getAndSetSuggestions = async () => {
            const currentSubject = debouncedSubject;

            if (currentSubject.length === 0) {
                const history = loadSearchHistory();
                if (history.length > 0) {
                    setAutoSuggestions(history);
                    setShowSuggestions(true);
                } else {
                    setAutoSuggestions([]);
                    setShowSuggestions(false);
                }
                return;
            }

            const historySuggestions = fetchHistorySuggestions(currentSubject);
            // Pass the signal to the fetch function
            const generalSuggestions = await fetchGeneralCourseSuggestions(currentSubject, 'subject', signal);

            // Ensure the request wasn't cancelled before setting state
            if (!signal.aborted) {
                const combinedSuggestions = [...new Set([...historySuggestions, ...generalSuggestions])];
                setAutoSuggestions(combinedSuggestions.slice(0, 7));
                setShowSuggestions(combinedSuggestions.length > 0);
            }
        };

        getAndSetSuggestions();

        // Cleanup function: abort the ongoing fetch request if component unmounts
        // or if a new `debouncedSubject` change triggers this effect again.
        return () => {
            controller.abort(); // Abort any pending fetch request
        };
    }, [debouncedSubject, fetchGeneralCourseSuggestions, fetchHistorySuggestions]);


    // Click outside handler to hide suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionsContainerRef.current && !suggestionsContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSuggestionClick = (suggestion: string) => {
        setCurrentSearchTerm(suggestion)
        setShowSuggestions(false);
    };

    // Handle search from the persistent search bar
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentSearchTerm.trim()) {
            const newParams = new URLSearchParams(params.toString());
            newParams.set('subject', currentSearchTerm.trim());
            saveSearchHistory(currentSearchTerm.trim());
            router.push(`/search?${newParams.toString()}`);
        }
    };

    return (
        <div className="min-h-screen bg-parchment dark:bg-dark-gray flex flex-col items-center pb-12">
            {/* Google-like Header */}
            <header className="fixed top-0 left-0 right-0 bg-parchment dark:bg-gray-900 shadow-md z-20 py-3 px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Logo/Home Link */}
                <Link href="/" className="text-2xl font-bold text-islamic-green dark:text-soft-blue flex-shrink-0">
                    Course Search Engine
                </Link>

                {/* Persistent Search Bar */}
                <form onSubmit={handleSearch} className="relative flex-grow max-w-xl mx-auto w-full">
                    <div className="relative flex items-center" ref={suggestionsContainerRef}>
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-600" />
                        <Input
                            type="search"
                            placeholder="Search for a course subject..."
                            value={currentSearchTerm}
                            onChange={(e) => setCurrentSearchTerm(e.target.value)}
                            ref={searchInputRef}
                            autoComplete="off"
                            onFocus={() => {
                                if (autoSuggestions.length > 0 || loadSearchHistory().length > 0) {
                                    setShowSuggestions(true);
                                    if (currentSearchTerm.length === 0) {
                                        setAutoSuggestions(loadSearchHistory());
                                    }
                                }
                            }}
                            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-islamic-green focus:border-transparent dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:ring-soft-blue"
                        />
                        {showSuggestions && autoSuggestions?.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                                {autoSuggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleSuggestionClick(suggestion);
                                        }}
                                    >
                                        {suggestion}
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button type="submit" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2">
                            <SearchIcon className="h-5 w-5 text-islamic-green dark:text-soft-blue" />
                        </Button>
                    </div>
                </form>

                {/* Nav & Theme Toggle */}
                <nav className="flex items-center space-x-4 flex-shrink-0 mt-2 md:mt-0">
                    <Link href="/" className="text-gray-700 dark:text-gray-300 hover:underline hover:text-islamic-green dark:hover:text-soft-blue text-sm transition-colors hidden sm:block">
                        New Search
                    </Link>
                    <Link href="/courses" className="text-gray-700 dark:text-gray-300 hover:underline hover:text-islamic-green dark:hover:text-soft-blue text-sm transition-colors hidden sm:block">
                        My Courses
                    </Link>
                    <Button
                        variant="ghost"
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
                </nav>
            </header>

            {/* Main Content Area - Push down by header height */}
            <main className="flex flex-col items-center w-full max-w-3xl pt-28 px-4 sm:px-6"> {/* Adjust padding-top to clear fixed header */}

                {/* Search Context / Result Count */}
                {subject && !isLoading && !error && (
                    <div className="w-full text-left text-sm text-gray-600 dark:text-gray-400 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                        {suggestions.length > 0 ? (
                            <p>
                                About {suggestions.length} results for &quot;<strong>{subject}</strong>&quot;{audience && ` for "${audience}"`}
                            </p>
                        ) : (
                            <p>
                                Showing results for &quot;<strong>{subject}</strong>&quot;{audience && ` for "${audience}"`}
                            </p>
                        )}
                        {goals && <p className="mt-1">Goals: {goals}</p>}
                        {verifiedBy && <p className="mt-1">Verified By: {verifiedBy}</p>}
                    </div>
                )}

                {/* Conditional Messages */}
                {error && (
                    <div className="w-full p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md shadow-sm mb-6">
                        {error}
                    </div>
                )}

                {isLoading && subject && (
                    <div className="flex flex-col items-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-islamic-green dark:text-soft-blue" />
                        <p className="mt-4 text-gray-700 dark:text-gray-300">Loading course suggestions...</p>
                    </div>
                )}

                {!isLoading && !subject && (
                    <div className="w-full p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md shadow-sm text-center py-10">
                        Please enter a subject in the search bar above to get course suggestions.
                    </div>
                )}

                {!isLoading && subject && suggestions.length === 0 && !error && (
                    <div className="w-full p-4 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-md shadow-sm text-center py-10">
                        No course suggestions found for your query. Try a different subject or refine your search.
                    </div>
                )}

                {/* Search Results Display */}
                {!isLoading && suggestions.length > 0 && (
                    <div className="w-full space-y-6">
                        {suggestions.map((course, id) => (
                            <div
                                key={id}
                                className={cn(
                                    "p-6 border rounded-lg shadow-sm transition-all flex flex-col",
                                    "bg-white dark:bg-gray-800",
                                    "border-gray-200 dark:border-gray-700",
                                    "hover:border-islamic-green hover:ring-2 hover:ring-islamic-green dark:hover:border-soft-blue dark:hover:ring-soft-blue",
                                    "group"
                                )}
                            >
                                <Link
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleGenerateFullCourse(course);
                                    }}
                                    className="flex flex-col h-full"
                                >
                                    {/* Domain/Verified By - smaller, above title */}
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                                        {course.verifiedBy && (
                                            <>
                                                <span className="capitalize">{course.verifiedBy}</span>
                                            </>
                                        )}
                                    </div>

                                    {/* Title - primary emphasis */}
                                    <h3 className="text-xl sm:text-2xl font-semibold text-blue-700 dark:text-blue-400 group-hover:underline cursor-pointer mb-2">
                                        {course.title}
                                        {isGeneratingFullCourse && selectedCourse == course && <>
                                            <Loader2 className="ml-3 h-5 w-5 animate-spin inline-block text-gray-500 dark:text-gray-400" />
                                            <span className="text-sm text-gray-400 dark:text-gray-300 hover:none">Generating course...</span>
                                        </>}
                                    </h3>

                                    {/* Description - snippet */}
                                    <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-3">
                                        {course.description}
                                    </p>

                                    {/* Key Info Chips/Badges - more organized */}
                                    <div className="flex flex-wrap gap-2 text-xs mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
                                        {course.durationWeeks > 0 && (
                                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full flex items-center">
                                                <span className="font-medium mr-1">⏱️</span> {course.durationWeeks} weeks
                                            </span>
                                        )}
                                        {course.difficulty && (
                                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full capitalize flex items-center">
                                                <span className="font-medium mr-1">⚙️</span> {course.difficulty}
                                            </span>
                                        )}
                                        {course.targetAudience && (
                                            <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full flex items-center">
                                                <span className="font-medium mr-1">🧑‍💻</span> {course.targetAudience}
                                            </span>
                                        )}
                                    </div>

                                    {/* Additional Details (Key Topics, Prerequisites) - collapsed or secondary */}
                                    {course.keyTopics.length > 0 && (
                                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Key Topics:</span> {course.keyTopics.slice(0, 3).join(', ')}...
                                        </div>
                                    )}
                                    {course.prerequisites.length > 0 && (
                                        <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Prerequisites:</span> {course.prerequisites.slice(0, 2).join(', ')}...
                                        </div>
                                    )}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function SearchPageLoadingFallback() {
    return (
        <div className="min-h-screen bg-parchment dark:bg-dark-gray flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl font-extrabold text-islamic-green dark:text-soft-blue mb-8 text-center">
                Search
            </h1>
            <div className="flex flex-col items-center py-10">
                <div className="relative flex-grow max-w-xl mx-auto w-full mb-8">
                    {/* Placeholder for the search input */}
                    <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                <Loader2 className="h-10 w-10 animate-spin text-islamic-green dark:text-soft-blue" />
                <p className="mt-4 text-xl text-gray-700 dark:text-gray-300">Loading search results...</p>
                {/* You can add a skeleton loader for the results area */}
                <div className="w-full max-w-3xl mt-8 space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-6 border rounded-lg shadow-sm bg-gray-100 dark:bg-gray-800 h-48 animate-pulse">
                            <div className="h-4 w-1/4 bg-gray-300 dark:bg-gray-600 mb-2"></div>
                            <div className="h-8 w-3/4 bg-gray-300 dark:bg-gray-600 mb-4"></div>
                            <div className="h-4 w-full bg-gray-300 dark:bg-gray-600 mb-2"></div>
                            <div className="h-4 w-5/6 bg-gray-300 dark:bg-gray-600 mb-2"></div>
                            <div className="h-4 w-2/3 bg-gray-300 dark:bg-gray-600"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<SearchPageLoadingFallback />}>
            <SearchResultsPage />
        </Suspense>
    );
}
