import React from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';

interface ConfidenceThresholdBarProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const ConfidenceThresholdBar: React.FC<ConfidenceThresholdBarProps> = ({ 
  confidence, 
  showLabel = true,
  size = 'medium' 
}) => {
  const getColor = (conf: number) => {
    if (conf >= 95) return '#4caf50'; // Excellent
    if (conf >= 85) return '#8bc34a'; // Very Good
    if (conf >= 75) return '#9c27b0'; // Good (Purple)
    if (conf >= 65) return '#ff9800'; // Fair
    if (conf >= 55) return '#ff5722'; // Poor
    return '#f44336'; // Very Poor
  };

  const getLabel = (conf: number) => {
    if (conf >= 95) return 'Excellent';
    if (conf >= 85) return 'Very Good';
    if (conf >= 75) return 'Good';
    if (conf >= 65) return 'Fair';
    if (conf >= 55) return 'Poor';
    return 'Very Poor';
  };

  const barHeight = size === 'small' ? 4 : size === 'medium' ? 6 : 8;
  const fontSize = size === 'small' ? '0.75rem' : size === 'medium' ? '0.875rem' : '1rem';

  return (
    <Box sx={{ width: '100%' }}>
      {showLabel && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize, fontWeight: 'bold' }}>
            {getLabel(confidence)}
          </Typography>
          <Typography variant="caption" sx={{ fontSize, color: 'text.secondary' }}>
            {confidence}%
          </Typography>
        </Box>
      )}
      
      <Box sx={{ position: 'relative' }}>
        {/* Background bar with threshold markers */}
        <LinearProgress
          variant="determinate"
          value={confidence}
          sx={{
            height: barHeight,
            borderRadius: barHeight / 2,
            backgroundColor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: getColor(confidence),
              borderRadius: barHeight / 2,
              transition: 'all 0.3s ease-in-out'
            }
          }}
        />
        
        {/* Threshold markers */}
        {[55, 65, 75, 85, 95].map((threshold) => (
          <Box
            key={threshold}
            sx={{
              position: 'absolute',
              left: `${threshold}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 1
            }}
          />
        ))}
        
        {/* Critical threshold line at 70% */}
        <Box
          sx={{
            position: 'absolute',
            left: '70%',
            top: -2,
            bottom: -2,
            width: '2px',
            backgroundColor: '#d32f2f',
            zIndex: 2,
            borderRadius: '1px'
          }}
        />
      </Box>
      
      {size !== 'small' && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            Poor
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'error.main' }}>
            70% Min
          </Typography>
          <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
            Excellent
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ConfidenceThresholdBar;