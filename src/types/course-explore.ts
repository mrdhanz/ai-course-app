export interface ExploreCourse {
  id: string;
  title: string;
  description: string;
  difficultyLevel: string;
  verifiedBy: string;
  totalDuration: number;
  language: string;
  skillsGained: Array<{ id: string; skill: string }>;
}
