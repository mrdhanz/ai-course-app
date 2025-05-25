// components/FilterBar.tsx
'use client'

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { languageMap } from '@/types/language';

interface FilterBarProps {
  searchValue: string;
  difficultyValue: string;
  languageValue: string;
  sortField: string;
  sortOrder: string;
  onSearchChange: (value: string) => void;
  onDifficultyChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
}

export function FilterBar({
  searchValue,
  difficultyValue,
  languageValue,
  sortField,
  sortOrder,
  onSearchChange,
  onDifficultyChange,
  onLanguageChange,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      <Input
        placeholder="Search courses..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="md:col-span-2"
      />
      
      <Select value={difficultyValue} onValueChange={onDifficultyChange}>
        <SelectTrigger>
          <SelectValue placeholder="All difficulty levels" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Levels</SelectItem>
          <SelectItem value="beginner">Beginner</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="advanced">Advanced</SelectItem>
        </SelectContent>
      </Select>
      
      <Select value={languageValue} onValueChange={onLanguageChange}>
        <SelectTrigger>
          <SelectValue placeholder="All Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Language</SelectItem>
          {Object.keys(languageMap).map(e=> <SelectItem key={e} value={e}>{languageMap[e]}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select 
        value={`${sortField}:${sortOrder}`} 
        onValueChange={(value) => {
          const [field, order] = value.split(':') as [string, 'asc' | 'desc'];
          onSortChange(field, order);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt:desc">Newest First</SelectItem>
          <SelectItem value="createdAt:asc">Oldest First</SelectItem>
          <SelectItem value="title:asc">Title (A-Z)</SelectItem>
          <SelectItem value="title:desc">Title (Z-A)</SelectItem>
          <SelectItem value="totalDuration:asc">Duration (Shortest)</SelectItem>
          <SelectItem value="totalDuration:desc">Duration (Longest)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}