import { renderHook } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { useNotification } from '../../components/NotificationProvider';

// Mock the notification provider
jest.mock('../../components/NotificationProvider', () => ({
  useNotification: jest.fn()
}));

const mockShowError = jest.fn();
const mockShowWarning = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useNotification as jest.Mock).mockReturnValue({
    showError: mockShowError,
    showWarning: mockShowWarning
  });
});

describe('useErrorHandler', () => {
  it('handles Error objects correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error message');

    const handledError = result.current.handleError(error);

    expect(handledError).toBeInstanceOf(Error);
    expect(handledError.message).toBe('Test error message');
    expect(mockShowError).toHaveBeenCalledWith('Test error message', 8000);
  });

  it('handles string errors correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const handledError = result.current.handleError('String error message');

    expect(handledError).toBeInstanceOf(Error);
    expect(handledError.message).toBe('String error message');
    expect(mockShowError).toHaveBeenCalledWith('String error message', 8000);
  });

  it('handles object errors with message property', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = { message: 'Object error message' };

    const handledError = result.current.handleError(error);

    expect(handledError).toBeInstanceOf(Error);
    expect(handledError.message).toBe('Object error message');
    expect(mockShowError).toHaveBeenCalledWith('Object error message', 8000);
  });

  it('handles unknown error types', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const handledError = result.current.handleError(null);

    expect(handledError).toBeInstanceOf(Error);
    expect(handledError.message).toBe('Unknown error occurred');
    expect(mockShowError).toHaveBeenCalledWith('An unexpected error occurred', 8000);
  });

  it('uses custom message when provided', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Original message');

    result.current.handleError(error, { customMessage: 'Custom error message' });

    expect(mockShowError).toHaveBeenCalledWith('Custom error message', 8000);
  });

  it('shows warning for warning-type errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Warning: This is a warning message');

    result.current.handleError(error);

    expect(mockShowWarning).toHaveBeenCalledWith('Warning: This is a warning message', 8000);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('respects showNotification option', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    result.current.handleError(error, { showNotification: false });

    expect(mockShowError).not.toHaveBeenCalled();
    expect(mockShowWarning).not.toHaveBeenCalled();
  });

  it('calls onError callback when provided', () => {
    const { result } = renderHook(() => useErrorHandler());
    const onError = jest.fn();
    const error = new Error('Test error');

    result.current.handleError(error, { onError });

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('logs to console when enabled', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Test error');

    result.current.handleError(error, { logToConsole: true });

    expect(consoleSpy).toHaveBeenCalledWith('Error handled:', error);

    consoleSpy.mockRestore();
  });

  it('handles async operations correctly', async () => {
    const { result } = renderHook(() => useErrorHandler());
    const successOperation = jest.fn().mockResolvedValue('success result');
    const failOperation = jest.fn().mockRejectedValue(new Error('Async error'));

    // Test successful operation
    const successResult = await result.current.handleAsyncError(successOperation);
    expect(successResult).toBe('success result');
    expect(mockShowError).not.toHaveBeenCalled();

    // Test failed operation
    const failResult = await result.current.handleAsyncError(failOperation);
    expect(failResult).toBeNull();
    expect(mockShowError).toHaveBeenCalledWith('Async error', 8000);
  });

  it('creates error handler with options', () => {
    const { result } = renderHook(() => useErrorHandler());
    const onError = jest.fn();
    
    const errorHandler = result.current.createErrorHandler({
      customMessage: 'Custom message',
      onError
    });

    const error = new Error('Test error');
    errorHandler(error);

    expect(mockShowError).toHaveBeenCalledWith('Custom message', 8000);
    expect(onError).toHaveBeenCalledWith(error);
  });
});