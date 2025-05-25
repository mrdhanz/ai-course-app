export interface LearningObjective {
  id?: string;
  objective: string;
  courseId?: string;
}

export interface SkillGained {
  id?: string;
  skill: string;
  courseId?: string;
}

export interface Module {
  id?: string;
  title: string;
  description: string;
  durationHours: number;
  lessons: Lesson[];
  courseId?: string;
}

export interface Lesson {
  id?: string;
  title: string;
  content: string | null;
  moduleId?: string;
}

export interface Course {
  id?: string;
  title: string;
  description: string;
  language: string;
  difficultyLevel: string;
  verifiedBy: string;
  totalDuration: number;
  learningObjectives: LearningObjective[] | string[];
  skillsGained: SkillGained[] | string[];
  modules: Module[];
  createdAt?: Date;
  updatedAt?: Date;
}
