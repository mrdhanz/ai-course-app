"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { courseSuggestionSchema, CourseSuggestionInput, courseSuggestionSelectedSchema } from "@/validations/course-suggestion";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { CourseSuggestion, CourseSuggestionsResponse } from "@/types/course-suggestion";
import { Loader2 } from "lucide-react";
import { languageMap } from "@/types/language";
import { useSearchParams } from "next/navigation";

export function CourseSuggestionForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingFullCourse, setIsGeneratingFullCourse] = useState(false);
    const [suggestions, setSuggestions] = useState<CourseSuggestion[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const params = useSearchParams();

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

    async function onSubmit(data: CourseSuggestionInput) {
        try {
            setIsSubmitting(true);
            setError(null);

            const response = await fetch('/api/ai/course/suggestions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }

            const result: CourseSuggestionsResponse = await response.json();
            setSuggestions(result.suggestions);
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
                    totalDuration: selectedCourse.durationWeeks * 24,
                    level: selectedCourse.difficulty,
                    lang: form.getValues('language'),
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
            // Handle the result (e.g., display in a modal or new page)
            console.log(result);
            await fetch('/api/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(result)
            })

        } catch (err) {
            console.error(err);
            setError("Failed to generate full course details. Please try again.");
        } finally {
            setIsGeneratingFullCourse(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-parchment dark:bg-dark-gray rounded-lg"> 
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-islamic-green dark:text-soft-blue">
                                    Subject
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g., Artificial Intelligence"
                                        {...field}
                                        className="bg-white dark:bg-gray-800"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="audience"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-islamic-green dark:text-soft-blue">
                                    Target Audience
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g., college students"
                                        {...field}
                                        className="bg-white dark:bg-gray-800"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="goals"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-islamic-green dark:text-soft-blue">
                                    Learning Goals (Optional)
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="What should students achieve from this course?"
                                        {...field}
                                        className="bg-white dark:bg-gray-800"
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
                            <FormItem>
                                <FormLabel className="text-islamic-green dark:text-soft-blue">
                                    Verified By (Optional)
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="e.g: Coursera, Google Developers"
                                        {...field}
                                        className="bg-white dark:bg-gray-800"
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
                                <FormLabel className="text-islamic-green dark:text-soft-blue">
                                    Language
                                </FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="bg-white dark:bg-gray-800">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.keys(languageMap).map(key => (
                                            <SelectItem key={key} value={key}>{languageMap[key]}</SelectItem>)
                                        )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Get Course Suggestions"
                        )}
                    </Button>
                </form>
            </Form>

            {error && (
                <div className="mt-6 p-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
                    {error}
                </div>
            )}

            {suggestions.length > 0 && (
                <div className="mt-8 space-y-6">
                    <h3 className="text-xl font-semibold text-islamic-green dark:text-soft-blue">
                        Suggested Courses
                    </h3>
                    <RadioGroup
                        value={selectedCourseId || ""}
                        onValueChange={setSelectedCourseId}
                        className="space-y-4"
                    >
                        {suggestions.map((course, id) => (
                            <div
                                key={id}
                                className="p-4 border border-islamic-green/20 dark:border-soft-blue/20 rounded-lg bg-white/50 dark:bg-gray-800/50"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex items-center h-5 mt-1">
                                        <RadioGroupItem value={id.toString()} id={`course-${id}`} />
                                    </div>
                                    <div className="flex-1">
                                        <label
                                            htmlFor={`course-${id}`}
                                            className="block text-lg font-medium text-islamic-green dark:text-soft-blue cursor-pointer"
                                        >
                                            {course.title}
                                        </label>

                                        <p className="mt-1 text-gray-700 dark:text-gray-300">
                                            {course.description}
                                        </p>

                                        <div className="mt-3 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-islamic-green dark:text-soft-blue">
                                                    Target Audience
                                                </p>
                                                <p>{course.targetAudience}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-islamic-green dark:text-soft-blue">
                                                    Duration
                                                </p>
                                                <p>{course.durationWeeks} weeks</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-islamic-green dark:text-soft-blue">
                                                    Difficulty
                                                </p>
                                                <p className="capitalize">{course.difficulty}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            <p className="text-sm font-medium text-islamic-green dark:text-soft-blue">
                                                Key Topics
                                            </p>
                                            <ul className="list-disc list-inside mt-1">
                                                {course.keyTopics.slice(0, 3).map((topic, i) => (
                                                    <li key={i}>{topic}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        {course.prerequisites.length > 0 && (
                                            <div className="mt-4">
                                                <p className="text-sm font-medium text-islamic-green dark:text-soft-blue">
                                                    Prerequisites
                                                </p>
                                                <ul className="list-disc list-inside mt-1">
                                                    {course.prerequisites.map((req, i) => (
                                                        <li key={i}>{req}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        <div className="mt-4">
                                            <div>
                                                <p className="text-sm font-medium text-islamic-green dark:text-soft-blue">
                                                    Verified By
                                                </p>
                                                <p className="capitalize">{course.verifiedBy}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </RadioGroup>
                    <Button
                        onClick={handleGenerateFullCourse}
                        disabled={isGeneratingFullCourse || !selectedCourseId}
                        className="w-full bg-islamic-green hover:bg-islamic-green/90 dark:bg-soft-blue dark:hover:bg-soft-blue/90"
                    >
                        {isGeneratingFullCourse ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
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