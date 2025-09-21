import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Stack
} from '@mui/material';
import { Refresh, BugReport } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  componentDidUpdate(prevProps: Props) {
    // Reset error state if children change
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Card>
            <CardContent>
              <Alert severity="error" sx={{ mb: 3 }}>
                <AlertTitle>Something went wrong</AlertTitle>
                An unexpected error occurred while rendering this component.
              </Alert>

              <Stack spacing={2}>
                <Typography variant="h6" gutterBottom>
                  Error Details
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
                </Typography>

                {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                  <Box sx={{ 
                    bgcolor: 'grey.100', 
                    p: 2, 
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    overflow: 'auto',
                    maxHeight: 200
                  }}>
                    <pre>{this.state.error.stack}</pre>
                  </Box>
                )}

                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={this.handleRetry}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<Refresh />}
                    onClick={this.handleReload}
                  >
                    Reload Page
                  </Button>
                  {process.env.NODE_ENV === 'development' && (
                    <Button
                      variant="text"
                      startIcon={<BugReport />}
                      onClick={() => console.error('Error details:', this.state.error, this.state.errorInfo)}
                    >
                      Log Details
                    </Button>
                  )}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;