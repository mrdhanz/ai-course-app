import { create } from 'zustand';
import { ExploreCourse } from '@/types/course-explore';

interface CourseState {
  courses: ExploreCourse[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    lang: string;
    difficulty: string;
    search: string;
  };
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };
  fetchCourses: () => Promise<void>;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setLanguageFilter: (lang: string) => void;
  setDifficultyFilter: (difficulty: string) => void;
  setSearchFilter: (search: string) => void;
  setSort: (field: string, order: 'asc' | 'desc') => void;
}

export const useCourseStore = create<CourseState>((set, get) => ({
  courses: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
  filters: {
    lang: 'all',
    difficulty: 'all',
    search: '',
  },
  sort: {
    field: 'createdAt',
    order: 'desc',
  },
  fetchCourses: async () => {
    set({ loading: true, error: null });
    try {
      const { pagination, filters, sort } = get();
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: sort.field,
        sortOrder: sort.order,
        ...(filters.lang && { lang: filters.lang }),
        ...(filters.difficulty && { difficulty: filters.difficulty }),
        ...(filters.search && { search: filters.search }),
      });

      const response = await fetch(`/api/courses?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch courses');

      const { data, pagination: resPagination } = await response.json();
      set({
        courses: data,
        pagination: {
          ...pagination,
          total: resPagination.total,
          totalPages: resPagination.totalPages,
        },
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to fetch courses' });
    } finally {
      set({ loading: false });
    }
  },
  setPage: (page) => set((state) => ({ pagination: { ...state.pagination, page } })),
  setLimit: (limit) => set((state) => ({ pagination: { ...state.pagination, limit, page: 1 } })),
  setLanguageFilter: (lang) => {
    set((state) => ({ filters: { ...state.filters, lang }, pagination: { ...state.pagination, page: 1 } }));
  },
  setDifficultyFilter: (difficulty) => {
    set((state) => ({ filters: { ...state.filters, difficulty }, pagination: { ...state.pagination, page: 1 } }));
  },
  setSearchFilter: (search) => {
    set((state) => ({ filters: { ...state.filters, search }, pagination: { ...state.pagination, page: 1 } }));
  },
  setSort: (field, order) => set({ sort: { field, order } }),
}));