import { LoadingSpinner } from './ui/loading';

interface SuspenseFallbackProps {
  message?: string;
  fullScreen?: boolean;
}

export function SuspenseFallback({ 
  message = "Loading...", 
  fullScreen = false 
}: SuspenseFallbackProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <LoadingSpinner />
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}