'use client'

import { CourseSuggestionForm } from "@/components/CourseSuggestionForm";
import AppLayout from '@/components/AppLayout';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react'; // Or create a dedicated Loading component

export default function Home() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-islamic-green dark:text-soft-blue" />
            <span className="ml-2 text-islamic-green dark:text-soft-blue">Loading form...</span>
          </div>
        }
      >
        <CourseSuggestionForm />
      </Suspense>
    </AppLayout>
  );
}