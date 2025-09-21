import { useState, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { useNotification } from '../components/NotificationProvider';

export interface AsyncOperationState {
  loading: boolean;
  error: string | null;
  data: any;
}

export interface AsyncOperationOptions {
  showSuccessNotification?: boolean;
  successMessage?: string;
  showErrorNotification?: boolean;
  errorMessage?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  resetOnStart?: boolean;
}

export const useAsyncOperation = <T = any>(
  initialData: T | null = null
) => {
  const [state, setState] = useState<AsyncOperationState>({
    loading: false,
    error: null,
    data: initialData
  });

  const { handleError } = useErrorHandler();
  const { showSuccess } = useNotification();

  const execute = useCallback(async (
    operation: () => Promise<T>,
    options: AsyncOperationOptions = {}
  ): Promise<T | null> => {
    const {
      showSuccessNotification = false,
      successMessage = 'Operation completed successfully',
      showErrorNotification = true,
      errorMessage,
      onSuccess,
      onError,
      resetOnStart = true
    } = options;

    try {
      setState(prev => ({
        ...prev,
        loading: true,
        error: resetOnStart ? null : prev.error
      }));

      const result = await operation();

      setState({
        loading: false,
        error: null,
        data: result
      });

      // Show success notification if enabled
      if (showSuccessNotification) {
        showSuccess(successMessage);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const errorObj = handleError(error, {
        showNotification: showErrorNotification,
        customMessage: errorMessage,
        onError
      });

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorObj.message
      }));

      return null;
    }
  }, [handleError, showSuccess]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: initialData
    });
  }, [initialData]);

  const setData = useCallback((data: T) => {
    setState(prev => ({
      ...prev,
      data
    }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({
      ...prev,
      error
    }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError
  };
};

export default useAsyncOperation;