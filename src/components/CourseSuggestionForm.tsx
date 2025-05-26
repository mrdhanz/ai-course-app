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
    FormMessage, // We'll minimize FormLabel for a cleaner look
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Still useful for optional detailed input
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState, useRef, useEffect } from "react"; // Added useRef and useEffect for focus
import { CourseSuggestion, CourseSuggestionsResponse } from "@/types/course-suggestion";
import { Loader2, Search } from "lucide-react"; // Added Search icon
import { languageMap } from "@/types/language";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils"; // Assuming you have a utility for class names

export function CourseSuggestionForm() {
    const params = useSearchParams();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingFullCourse, setIsGeneratingFullCourse] = useState(false);
    const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

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

    // Focus on the search input when the component mounts
    useEffect(() => {
        if(form)
            form.setFocus('subject');
    }, []);

    async function onSubmit(data: CourseSuggestionInput) {
        try {
            setIsSubmitting(true);
            setError(null);
            setSuggestions([]); // Clear previous suggestions

            // Only subject is mandatory for the "search" part
            const payload = {
                subject: data.subject,
                audience: data.audience || undefined, // Send only if present
                goals: data.goals || undefined,
                verifiedBy: data.verifiedBy || undefined,
                language: data.language,
            };

            const response = await fetch('/api/ai/course/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }

            const result: CourseSuggestionsResponse = await response.json();
            setSuggestions(result.suggestions);
            setSelectedCourseId(null); // Reset selected course
        } catch (err) {
            console.error(err);
            setError("Failed to get course suggestions. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleGenerateFullCourse() {
        if (!selectedCourseId) {
            setError("Please select a course first");
            return;
        }

        try {
            setIsGeneratingFullCourse(true);
            setError(null);

            const selectedCourse = suggestions[parseInt(selectedCourseId)];
            if (!selectedCourse) {
                throw new Error('Selected course not found');
            }

            const response = await fetch('/api/ai/course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    courseTitle: selectedCourse.title,
                    verifiedBy: selectedCourse.verifiedBy,
                    totalDuration: selectedCourse.durationWeeks * 24, // Assuming 24 hours/week for duration
                    level: selectedCourse.difficulty,
                    lang: form.getValues('language'), // Use the selected language from the form
                    keyTopics: selectedCourse.keyTopics,
                    targetAudience: selectedCourse.targetAudience,
                    prerequisites: selectedCourse.prerequisites,
                    suggestions: true,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate full course');
            }

            const result = await response.json();
            const res = await fetch('/api/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(result)
            })

            if (!res.ok) {
                throw new Error('Failed to generate full course');
            }

            const course = await res.json();
            router.push(`/courses/${course.id}`)
        } catch (err) {
            console.error(err);
            setError("Failed to generate full course details. Please try again.");
        } finally {
            setIsGeneratingFullCourse(false);
        }
    }

    // Function to handle Enter key press for immediate search
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !isSubmitting) {
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
                        {/* Main Search Input */}
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="relative flex items-center">
                                        <Search className="absolute left-3 h-5 w-5 text-gray-400 dark:text-gray-600" />
                                        <FormControl>
                                            <Input
                                                placeholder="Search for a course subject, e.g., 'Artificial Intelligence for Beginners'"
                                                {...field}
                                                className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-300 focus-visible:ring-2 focus-visible:ring-islamic-green focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-soft-blue transition-all"
                                                onKeyPress={handleKeyPress}
                                            />
                                        </FormControl>
                                    </div>
                                    <FormMessage className="text-right mt-1" />
                                </FormItem>
                            )}
                        />

                        {/* Optional Advanced Search / Filters - Collapsible or always visible */}
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

            {/* --- */}
            {suggestions.length > 0 && (
                <div className="mt-8 w-full max-w-3xl space-y-6">
                    <h2 className="text-2xl font-bold text-islamic-green dark:text-soft-blue text-center mb-6">
                        Course Suggestions
                    </h2>
                    <RadioGroup
                        value={selectedCourseId || ""}
                        onValueChange={setSelectedCourseId}
                        className="space-y-4"
                    >
                        {suggestions.map((course, id) => (
                            <div
                                key={id}
                                className={cn(
                                    "p-5 border rounded-lg shadow-sm cursor-pointer transition-all",
                                    "bg-white dark:bg-gray-800",
                                    "border-gray-200 dark:border-gray-700",
                                    selectedCourseId === id.toString()
                                        ? "border-islamic-green ring-2 ring-islamic-green dark:border-soft-blue dark:ring-soft-blue"
                                        : "hover:border-gray-400 dark:hover:border-gray-600"
                                )}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex items-center h-5 mt-1">
                                        <RadioGroupItem value={id.toString()} id={`course-${id}`} className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <label
                                            htmlFor={`course-${id}`}
                                            className="block text-xl font-semibold text-islamic-green dark:text-soft-blue cursor-pointer mb-2"
                                        >
                                            {course.title}
                                        </label>

                                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                                            {course.description}
                                        </p>

                                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-800 dark:text-gray-200">
                                            <div>
                                                <p className="font-medium text-islamic-green dark:text-soft-blue">Target Audience:</p>
                                                <p>{course.targetAudience}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-islamic-green dark:text-soft-blue">Duration:</p>
                                                <p>{course.durationWeeks} weeks</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-islamic-green dark:text-soft-blue">Difficulty:</p>
                                                <p className="capitalize">{course.difficulty}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium text-islamic-green dark:text-soft-blue">Verified By:</p>
                                                <p className="capitalize">{course.verifiedBy || "N/A"}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <p className="font-medium text-islamic-green dark:text-soft-blue">Key Topics:</p>
                                            <ul className="list-disc list-inside mt-1 text-gray-700 dark:text-gray-300">
                                                {course.keyTopics.slice(0, 5).map((topic, i) => (
                                                    <li key={i}>{topic}</li>
                                                ))}
                                                {course.keyTopics.length > 5 && (
                                                    <li className="text-gray-500 dark:text-gray-400">...and more</li>
                                                )}
                                            </ul>
                                        </div>
                                        {course.prerequisites.length > 0 && (
                                            <div className="mt-4">
                                                <p className="font-medium text-islamic-green dark:text-soft-blue">Prerequisites:</p>
                                                <ul className="list-disc list-inside mt-1 text-gray-700 dark:text-gray-300">
                                                    {course.prerequisites.map((req, i) => (
                                                        <li key={i}>{req}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </RadioGroup>
                    <Button
                        onClick={handleGenerateFullCourse}
                        disabled={isGeneratingFullCourse || !selectedCourseId}
                        className="w-full py-3 px-6 rounded-full bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90 text-lg font-semibold transition-all flex items-center justify-center gap-2 mt-6"
                    >
                        {isGeneratingFullCourse ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Generating Full Course...
                            </>
                        ) : (
                            "Generate Full Course Details"
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}