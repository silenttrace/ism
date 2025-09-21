import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from '../ErrorBoundary';
import NotificationProvider, { useNotification } from '../NotificationProvider';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useAsyncOperation } from '../../hooks/useAsyncOperation';

// Test component that uses all error handling features
const TestApp = () => {
  const { showSuccess } = useNotification();
  const { handleError } = useErrorHandler();
  const asyncOp = useAsyncOperation();

  const handleManualError = () => {
    handleError(new Error('Manual error test'));
  };

  const handleAsyncError = async () => {
    await asyncOp.execute(async () => {
      throw new Error('Async operation failed');
    });
  };

  const handleSuccess = () => {
    showSuccess('Operation completed successfully');
  };

  return (
    <div>
      <button onClick={handleManualError}>Trigger Error</button>
      <button onClick={handleAsyncError}>Trigger Async Error</button>
      <button onClick={handleSuccess}>Show Success</button>
      {asyncOp.loading && <div>Loading...</div>}
      {asyncOp.error && <div>Error: {asyncOp.error}</div>}
    </div>
  );
};

// Component that throws an error for testing error boundary
const ErrorComponent = () => {
  throw new Error('Component error');
};

describe('Error Handling Integration', () => {
  it('handles errors with notifications and error boundary', async () => {
    render(
      <ErrorBoundary>
        <NotificationProvider>
          <TestApp />
        </NotificationProvider>
      </ErrorBoundary>
    );

    // Test manual error handling
    fireEvent.click(screen.getByText('Trigger Error'));

    await waitFor(() => {
      expect(screen.getByText('Manual error test')).toBeInTheDocument();
    });

    // Test async error handling
    fireEvent.click(screen.getByText('Trigger Async Error'));

    await waitFor(() => {
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Error: Async operation failed')).toBeInTheDocument();
    });

    // Test success notification
    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    });
  });

  it('error boundary catches component errors', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    render(
      <ErrorBoundary>
        <NotificationProvider>
          <ErrorComponent />
        </NotificationProvider>
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Component error')).toBeInTheDocument();

    console.error = originalError;
  });

  it('provides recovery options in error boundary', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    render(
      <ErrorBoundary>
        <NotificationProvider>
          <ErrorComponent />
        </NotificationProvider>
      </ErrorBoundary>
    );

    expect(screen.getByText('Try Again')).toBeInTheDocument();
    expect(screen.getByText('Reload Page')).toBeInTheDocument();

    console.error = originalError;
  });

  it('notifications stack properly', async () => {
    render(
      <ErrorBoundary>
        <NotificationProvider maxNotifications={3}>
          <TestApp />
        </NotificationProvider>
      </ErrorBoundary>
    );

    // Trigger multiple errors
    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText('Trigger Error'));
    fireEvent.click(screen.getByText('Show Success'));

    await waitFor(() => {
      // Should show multiple notifications
      const errorNotifications = screen.getAllByText('Manual error test');
      expect(errorNotifications).toHaveLength(2);
      expect(screen.getByText('Operation completed successfully')).toBeInTheDocument();
    });
  });
});