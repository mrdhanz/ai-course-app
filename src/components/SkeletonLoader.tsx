// components/SkeletonLoader.tsx
export function SkeletonLoader() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
        </div>
        <div className="h-6 w-full bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
        <div className="flex flex-wrap gap-1 mb-3">
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}