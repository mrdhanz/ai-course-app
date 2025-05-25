'use client'

import { CourseSuggestionForm } from "@/components/CourseSuggestionForm";
import AppLayout from '@/components/AppLayout';

export default function Home() {
  return (
    <AppLayout>
        <CourseSuggestionForm />
    </AppLayout>
  );
}