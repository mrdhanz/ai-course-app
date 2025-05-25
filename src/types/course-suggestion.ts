export interface CourseSuggestion {
  title: string;
  description: string;
  targetAudience: string;
  keyTopics: string[];
  durationWeeks: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  verifiedBy: string;
}

export interface CourseSuggestionsResponse {
  suggestions: CourseSuggestion[];
}