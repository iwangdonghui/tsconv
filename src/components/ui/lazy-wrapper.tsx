import { AlertTriangle, RefreshCw } from 'lucide-react';
import React, { ComponentType, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ComponentLoading, PageLoading } from './loading-spinner';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: ComponentType<ErrorFallbackProps>;
  name?: string;
  fullPage?: boolean;
}

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  name?: string;
}

function DefaultErrorFallback({ error, resetErrorBoundary, name }: ErrorFallbackProps) {
  return (
    <div className='flex flex-col items-center justify-center min-h-[300px] p-8 text-center'>
      <div className='flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4'>
        <AlertTriangle className='w-8 h-8 text-destructive' />
      </div>

      <h3 className='text-lg font-semibold text-foreground mb-2'>
        Failed to load {name || 'component'}
      </h3>

      <p className='text-sm text-muted-foreground mb-4 max-w-md'>
        Something went wrong while loading this part of the application.
      </p>

      <button
        onClick={resetErrorBoundary}
        className='inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors'
      >
        <RefreshCw className='w-4 h-4' />
        Try again
      </button>

      {((typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') ||
        import.meta.env.DEV) && (
        <details className='mt-4 text-left'>
          <summary className='cursor-pointer text-sm text-muted-foreground hover:text-foreground'>
            Error details (development only)
          </summary>
          <pre className='mt-2 p-2 bg-muted rounded text-xs overflow-auto max-w-md'>
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}

export function LazyWrapper({
  children,
  fallback,
  errorFallback,
  name,
  fullPage = false,
}: LazyWrapperProps) {
  const defaultFallback = fullPage ? (
    <PageLoading title={`Loading ${name || 'page'}...`} />
  ) : (
    <ComponentLoading name={name} />
  );

  const defaultErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => (
    <DefaultErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} name={name} />
  );

  return (
    <ErrorBoundary
      FallbackComponent={errorFallback || defaultErrorFallback}
      onReset={() => {
        // Optionally reload the page or reset state
        if (fullPage) {
          window.location.reload();
        }
      }}
    >
      <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}

// Higher-order component for wrapping lazy-loaded components
export function withLazyWrapper<P extends object>(
  Component: ComponentType<P>,
  options: {
    name?: string;
    fullPage?: boolean;
    fallback?: React.ReactNode;
    errorFallback?: ComponentType<ErrorFallbackProps>;
  } = {}
) {
  const WrappedComponent = (props: P) => (
    <LazyWrapper {...options}>
      <Component {...props} />
    </LazyWrapper>
  );

  WrappedComponent.displayName = `withLazyWrapper(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Preload function for better UX
export function preloadComponent(componentImport: () => Promise<any>) {
  // Start loading the component
  componentImport();
}

// Hook for preloading components on hover/focus
export function usePreloadComponent(componentImport: () => Promise<any>) {
  const preload = React.useCallback(() => {
    preloadComponent(componentImport);
  }, [componentImport]);

  return {
    onMouseEnter: preload,
    onFocus: preload,
  };
}
