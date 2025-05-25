// components/EmptyState.tsx
import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description: string;
  subject?: string;
}

export function EmptyState({ title, description, subject }: EmptyStateProps) {
  
  return (
    <div className="text-center py-12">
      <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-full h-full"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6">{description}</p>
      <Link
        href={`/${subject ?`?subject=${subject}` : ''}`}
        
        className="hover:bg-islamic-green/90 dark:hover:bg-soft-blue/90"
      >
        Generate Course
      </Link>
    </div>
  );
}