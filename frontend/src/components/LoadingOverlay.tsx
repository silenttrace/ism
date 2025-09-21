import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Backdrop,
  Card,
  CardContent,
  Stack
} from '@mui/material';

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  progress?: number;
  showProgress?: boolean;
  variant?: 'backdrop' | 'inline' | 'card';
  size?: 'small' | 'medium' | 'large';
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  open,
  message = 'Loading...',
  progress,
  showProgress = false,
  variant = 'backdrop',
  size = 'medium'
}) => {
  const getSizeProps = () => {
    switch (size) {
      case 'small':
        return { circularSize: 24, typography: 'body2' as const };
      case 'large':
        return { circularSize: 60, typography: 'h6' as const };
      default:
        return { circularSize: 40, typography: 'body1' as const };
    }
  };

  const { circularSize, typography } = getSizeProps();

  const LoadingContent = () => (
    <Stack spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
      {showProgress && typeof progress === 'number' ? (
        <Box sx={{ width: '100%', minWidth: 200 }}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ mb: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary">
            {Math.round(progress)}% complete
          </Typography>
        </Box>
      ) : (
        <CircularProgress size={circularSize} />
      )}
      
      <Typography variant={typography} color="text.secondary">
        {message}
      </Typography>
    </Stack>
  );

  if (!open) return null;

  switch (variant) {
    case 'backdrop':
      return (
        <Backdrop
          sx={{ 
            color: '#fff', 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }}
          open={open}
        >
          <LoadingContent />
        </Backdrop>
      );

    case 'card':
      return (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: (theme) => theme.zIndex.modal
          }}
        >
          <Card sx={{ minWidth: 300 }}>
            <CardContent>
              <LoadingContent />
            </CardContent>
          </Card>
        </Box>
      );

    case 'inline':
    default:
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: 3
          }}
        >
          <LoadingContent />
        </Box>
      );
  }
};

export default LoadingOverlay;