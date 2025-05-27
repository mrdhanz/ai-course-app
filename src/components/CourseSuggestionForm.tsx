"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { courseSuggestionSchema, CourseSuggestionInput } from "@/validations/course-suggestion";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useRef, useCallback } from "react"; // Added useCallback
import { Loader2, Search, X } from "lucide-react";
import { languageMap } from "@/types/language";
import { useRouter, useSearchParams } from "next/navigation";

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

export function CourseSuggestionForm() {
    const params = useSearchParams();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsContainerRef = useRef<HTMLDivElement>(null);

    const form = useForm<CourseSuggestionInput>({
        resolver: zodResolver(courseSuggestionSchema),
        defaultValues: {
            subject: params.get('subject') || "",
            audience: "",
            goals: "",
            verifiedBy: "",
            language: "ID",
        },
    });

    // Debounced value for fetching suggestions to prevent excessive calls
    const [debouncedSubject, setDebouncedSubject] = useState(form.getValues('subject'));
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSubject(form.getValues('subject'));
        }, 300); // Debounce delay

        return () => {
            clearTimeout(handler);
        };
    }, [form.watch('subject')]);

    // Focus on the search input when the component mounts
    useEffect(() => {
        if (form) {
            form.setFocus('subject');
        }
    }, [form]);

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
                    setSuggestions(history);
                    setShowSuggestions(true);
                } else {
                    setSuggestions([]);
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
                setSuggestions(combinedSuggestions.slice(0, 7));
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
        form.setValue('subject', suggestion, { shouldValidate: true });
        setShowSuggestions(false);
        form.setFocus('subject');
    };

    async function onSubmit(data: CourseSuggestionInput) {
        try {
            setIsSubmitting(true);
            setError(null);
            const payload = {
                subject: data.subject,
                audience: data.audience || undefined,
                goals: data.goals || undefined,
                verifiedBy: data.verifiedBy || undefined,
                language: data.language,
            };
            const searchParams = new URLSearchParams();
            Object.entries(payload).forEach(([key, value]) => {
                if (!key || !value) return;
                searchParams.append(key, value);
            })

            router.push(`/search?${searchParams.toString()}`);
            saveSearchHistory(data.subject);
        } catch (err) {
            console.error(err);
            setError("Failed to get course suggestions. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isSubmitting) {
            e.preventDefault();
            form.handleSubmit(onSubmit)();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-parchment dark:bg-dark-gray p-4 sm:p-6">
            <div className="w-full max-w-3xl mb-8 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-islamic-green dark:text-soft-blue mb-6">
                    Course Search Engine
                </h1>
                <p className="text-lg text-gray-700 dark:text-gray-300">
                    Discover and create your ideal course with AI-powered suggestions.
                </p>
            </div>

            <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 sm:p-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="relative flex items-center" ref={suggestionsContainerRef}>
                                        <Search className="absolute left-3 h-5 w-5 text-gray-400 dark:text-gray-600" />
                                        <FormControl>
                                            <Input
                                                placeholder="Search for a course subject, e.g., 'Artificial Intelligence for Beginners'"
                                                {...field}
                                                className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-300 focus-visible:ring-2 focus-visible:ring-islamic-green focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-soft-blue transition-all"
                                                onKeyPress={handleKeyPress}
                                                ref={searchInputRef}
                                                autoComplete="off"
                                                onFocus={() => {
                                                    if (suggestions.length > 0 || loadSearchHistory().length > 0) {
                                                        setShowSuggestions(true);
                                                        if (form.getValues('subject').length === 0) {
                                                            setSuggestions(loadSearchHistory());
                                                        }
                                                    }
                                                }}
                                            />
                                        </FormControl>
                                        {form.getValues('subject').length > 0 && (
                                            <X className="absolute right-3 h-5 w-5 text-gray-400 dark:text-gray-600 cursor-pointer" onClick={() => form.resetField('subject')} />
                                        )}
                                        {showSuggestions && suggestions?.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto">
                                                {suggestions.map((suggestion, index) => (
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
                                    </div>
                                    <FormMessage className="text-right mt-1" />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="audience"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                placeholder="Target Audience (e.g., college students)"
                                                {...field}
                                                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="language"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-sm">
                                                    <SelectValue placeholder="Language" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.keys(languageMap).map(key => (
                                                    <SelectItem key={key} value={key}>{languageMap[key]}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="goals"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormControl>
                                            <Textarea
                                                placeholder="Specific learning goals (Optional)"
                                                {...field}
                                                rows={2}
                                                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-sm resize-none"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="verifiedBy"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormControl>
                                            <Input
                                                placeholder="Verified by (e.g., Coursera, Google Developers - Optional)"
                                                {...field}
                                                className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 rounded-md py-2 px-3 text-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-3 px-6 rounded-full bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90 text-lg font-semibold transition-all flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="h-5 w-5" />
                                    Search for Courses
                                </>
                            )}
                        </Button>
                    </form>
                </Form>
            </div>

            {error && (
                <div className="mt-8 w-full max-w-3xl p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md shadow-sm">
                    {error}
                </div>
            )}
        </div>
    );
}