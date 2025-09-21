import React from 'react';
import { Box, Typography, keyframes } from '@mui/material';

const scanAnimation = keyframes`
  0% {
    left: -100px;
  }
  50% {
    left: calc(100% - 100px);
  }
  100% {
    left: -100px;
  }
`;

const textFade = keyframes`
  0% {
    opacity: 0.3;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.3;
  }
`;

interface ScanningAnimationProps {
  processedControls: number;
  totalControls: number;
}

const ScanningAnimation: React.FC<ScanningAnimationProps> = ({ 
  processedControls, 
  totalControls 
}) => {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 33, // Reduced by 45% (60 * 0.55 = 33)
        backgroundColor: '#000',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: 3,
      }}
    >
      {/* Red scanning bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          width: 100,
          height: '100%',
          background: 'linear-gradient(90deg, transparent 0%, #ff0000 20%, #ff4444 50%, #ff0000 80%, transparent 100%)',
          animation: `${scanAnimation} 3s ease-in-out infinite`,
          zIndex: 2,
        }}
      />
      
      {/* Text that fades in and out slowly */}
      <Typography
        variant="body1"
        sx={{
          color: '#fff',
          fontFamily: 'monospace',
          fontWeight: 'bold',
          letterSpacing: 2,
          animation: `${textFade} 2s ease-in-out infinite`,
          zIndex: 1,
          textShadow: '0 0 10px #ff0000',
          fontSize: '1rem',
        }}
      >
        THINKING...
      </Typography>
    </Box>
  );
};

export default ScanningAnimation;