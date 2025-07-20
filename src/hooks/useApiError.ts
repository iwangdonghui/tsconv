import { useState, useCallback } from 'react';

interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export function useApiError() {
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const apiError: ApiError = {
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
        code: (err as any)?.code,
        status: (err as any)?.status
      };
      setError(apiError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isLoading,
    handleApiCall,
    clearError
  };
}