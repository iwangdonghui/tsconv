import * as Sentry from '@sentry/react';
import { AlertTriangle, Home, MessageSquare, RefreshCw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showFeedbackDialog?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showFeedback: boolean;
  feedbackSubmitted: boolean;
  eventId?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      showFeedback: false,
      feedbackSubmitted: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);

    // Report error to Sentry with React context
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: true,
        component: 'ErrorBoundary',
      },
    });

    // Add breadcrumb for debugging
    Sentry.addBreadcrumb({
      message: 'Error caught by ErrorBoundary',
      category: 'error',
      level: 'error',
      data: {
        componentStack: errorInfo.componentStack,
      },
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({ error, errorInfo, eventId });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      showFeedback: false,
      feedbackSubmitted: false,
      eventId: undefined,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleShowFeedback = () => {
    this.setState({ showFeedback: true });
  };

  handleSubmitFeedback = (feedback: string) => {
    if (this.state.eventId) {
      Sentry.captureFeedback({
        message: feedback,
        name: 'Anonymous User',
        email: 'user@example.com',
        associatedEventId: this.state.eventId,
      });
    }

    this.setState({ feedbackSubmitted: true, showFeedback: false });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='min-h-screen flex items-center justify-center p-4'>
          <div className='max-w-md w-full text-center space-y-6'>
            <div className='flex justify-center'>
              <AlertTriangle className='w-16 h-16 text-red-500' />
            </div>

            <div className='space-y-2'>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                Oops! Something went wrong
              </h1>
              <p className='text-gray-600 dark:text-gray-400'>
                We encountered an unexpected error. Please try again or return to the homepage.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className='text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm'>
                <summary className='cursor-pointer font-medium mb-2'>Error Details</summary>
                <pre className='whitespace-pre-wrap text-red-600 dark:text-red-400'>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {this.state.feedbackSubmitted && (
              <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4'>
                <p className='text-green-800 dark:text-green-200 text-sm'>
                  Thank you for your feedback! We'll use it to improve the application.
                </p>
              </div>
            )}

            {this.state.showFeedback && !this.state.feedbackSubmitted && (
              <div className='bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-left'>
                <h3 className='font-medium text-gray-900 dark:text-white mb-2'>Help us improve</h3>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-3'>
                  What were you trying to do when this error occurred?
                </p>
                <textarea
                  className='w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
                  rows={3}
                  placeholder='Describe what happened...'
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      this.handleSubmitFeedback((e.target as HTMLTextAreaElement).value);
                    }
                  }}
                />
                <div className='flex gap-2 mt-3'>
                  <Button
                    size='sm'
                    onClick={e => {
                      const textarea = e.currentTarget.parentElement
                        ?.previousElementSibling as HTMLTextAreaElement;
                      this.handleSubmitFeedback(textarea?.value || '');
                    }}
                  >
                    Send Feedback
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => this.setState({ showFeedback: false })}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className='flex gap-3 justify-center flex-wrap'>
              <Button onClick={this.handleRetry} variant='default'>
                <RefreshCw className='w-4 h-4 mr-2' />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant='outline'>
                <Home className='w-4 h-4 mr-2' />
                Go Home
              </Button>
              {this.props.showFeedbackDialog !== false &&
                !this.state.showFeedback &&
                !this.state.feedbackSubmitted && (
                  <Button onClick={this.handleShowFeedback} variant='outline'>
                    <MessageSquare className='w-4 h-4 mr-2' />
                    Report Issue
                  </Button>
                )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
