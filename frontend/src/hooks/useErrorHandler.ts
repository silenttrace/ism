import { useCallback } from 'react';
import { useNotification } from '../components/NotificationProvider';

export interface ErrorHandlerOptions {
  showNotification?: boolean;
  notificationDuration?: number;
  logToConsole?: boolean;
  customMessage?: string;
  onError?: (error: Error) => void;
}

export const useErrorHandler = () => {
  const { showError, showWarning } = useNotification();

  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showNotification = true,
      notificationDuration = 8000,
      logToConsole = true,
      customMessage,
      onError
    } = options;

    // Extract error message
    let errorMessage = 'An unexpected error occurred';
    let actualError: Error;

    if (error instanceof Error) {
      actualError = error;
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      actualError = new Error(error);
      errorMessage = error;
    } else if (error && typeof error === 'object' && 'message' in error) {
      actualError = new Error(String(error.message));
      errorMessage = String(error.message);
    } else {
      actualError = new Error('Unknown error occurred');
    }

    // Use custom message if provided
    const displayMessage = customMessage || errorMessage;

    // Log to console if enabled
    if (logToConsole) {
      console.error('Error handled:', actualError);
    }

    // Show notification if enabled
    if (showNotification) {
      // Determine severity based on error type
      if (errorMessage.toLowerCase().includes('warning') || 
          errorMessage.toLowerCase().includes('deprecated')) {
        showWarning(displayMessage, notificationDuration);
      } else {
        showError(displayMessage, notificationDuration);
      }
    }

    // Call custom error handler if provided
    if (onError) {
      onError(actualError);
    }

    return actualError;
  }, [showError, showWarning]);

  const handleAsyncError = useCallback(async <T>(
    asyncOperation: () => Promise<T>,
    options: ErrorHandlerOptions = {}
  ): Promise<T | null> => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError]);

  const createErrorHandler = useCallback((
    options: ErrorHandlerOptions = {}
  ) => {
    return (error: unknown) => handleError(error, options);
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    createErrorHandler
  };
};

export default useErrorHandler;