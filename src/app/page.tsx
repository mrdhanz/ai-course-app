'use client'

import { CourseSuggestionForm } from "@/components/CourseSuggestionForm";
import { Suspense } from 'react';
import { Loader2, SunIcon, MoonIcon } from 'lucide-react'; // Import SunIcon and MoonIcon
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming you have your Button component
import { useTheme } from "next-themes"; // Import useTheme hook

export default function Home() {
  const { theme, setTheme } = useTheme(); // Use the useTheme hook
  return (
    // We'll wrap the entire content in a div to manage layout for the header
    <div className="min-h-screen bg-parchment dark:bg-dark-gray relative">
      {/* Header - Top Right */}
      <header className="absolute top-0 right-0 p-4 z-10">
        <nav>
          <ul className="flex items-center space-x-4">
            <li>
              {/* Using a regular <a> tag if /courses doesn't exist yet, 
                  otherwise use Link component for client-side navigation */}
              <Link href="/courses" className="text-gray-700 dark:text-gray-300 hover:underline hover:text-islamic-green dark:hover:text-soft-blue transition-colors">
                Courses
              </Link>
            </li>
            {/* Add more menu items here, like a profile icon or settings */}
            {/* Theme Toggle */}
            <li className="flex items-center"> {/* Wrap in li for consistent spacing/alignment */}
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
            </li>
          </ul>
        </nav>
      </header>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-screen"> {/* Use h-screen for full height */}
            <Loader2 className="h-8 w-8 animate-spin text-islamic-green dark:text-soft-blue" />
            <span className="ml-2 text-islamic-green dark:text-soft-blue">Loading form...</span>
          </div>
        }
      >
        {/* CourseSuggestionForm will now be rendered below the header, adjust its internal padding/margin if needed */}
        <CourseSuggestionForm />
      </Suspense>
    </div>
  );
}