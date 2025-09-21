import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import { Info, Close } from '@mui/icons-material';

interface ConfidenceScoreInfoProps {
  trigger?: 'icon' | 'chip';
  size?: 'small' | 'medium';
}

const ConfidenceScoreInfo: React.FC<ConfidenceScoreInfoProps> = ({ 
  trigger = 'icon', 
  size = 'small' 
}) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const scoreRanges = [
    {
      range: '95-100',
      label: 'Functionally Identical',
      description: 'Controls are audit substitutable - one can replace the other in compliance assessments',
      color: '#4caf50',
      example: 'Both require identical access control policies with same implementation approach'
    },
    {
      range: '85-94',
      label: 'Strong Alignment',
      description: 'Very similar objectives with only minor differences in language or emphasis',
      color: '#8bc34a',
      example: 'Same security outcome, slight differences in documentation requirements'
    },
    {
      range: '75-84',
      label: 'Good Mapping',
      description: 'Same intent and objectives, some variations in implementation approach',
      color: '#9c27b0',
      example: 'Both address encryption, but different key management requirements'
    },
    {
      range: '65-74',
      label: 'Reasonable Correlation',
      description: 'Related objectives with notable gaps or additional requirements',
      color: '#ff9800',
      example: 'Similar access control goals, but different scope or technical requirements'
    },
    {
      range: '55-64',
      label: 'Weak Relationship',
      description: 'Some overlap in security domains but significant differences in approach',
      color: '#ff5722',
      example: 'Both relate to incident response but cover different phases or responsibilities'
    },
    {
      range: 'Below 55',
      label: 'Poor Mapping',
      description: 'Different objectives, scope, or security domains - not recommended for mapping',
      color: '#f44336',
      example: 'Physical security control mapped to network security control'
    }
  ];

  const TriggerComponent = () => {
    if (trigger === 'chip') {
      return (
        <Chip
          icon={<Info />}
          label="Confidence Guide"
          size={size}
          variant="outlined"
          onClick={handleOpen}
          sx={{ cursor: 'pointer' }}
        />
      );
    }
    
    return (
      <IconButton 
        size={size} 
        onClick={handleOpen}
        sx={{ ml: 0.5 }}
        title="Learn about confidence scores"
      >
        <Info fontSize={size} />
      </IconButton>
    );
  };

  return (
    <>
      <TriggerComponent />
      
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: { minHeight: '70vh' }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5" component="div">
            🎯 Confidence Score Guide
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body1" paragraph>
            Our AI compliance expert analyzes ISM controls against NIST 800-53 using 20+ years of 
            cybersecurity framework experience. Confidence scores reflect how well controls align 
            from both technical and compliance audit perspectives.
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Expert Analysis Framework
            </Typography>
            <Typography variant="body2" paragraph>
              Each mapping considers: <strong>Functional Equivalence</strong>, <strong>Implementation Similarity</strong>, 
              <strong>Scope Alignment</strong>, <strong>Compliance Intent</strong>, <strong>Risk Mitigation</strong>, 
              and <strong>Organizational Impact</strong>.
            </Typography>
          </Box>

          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Score Range</strong></TableCell>
                  <TableCell><strong>Classification</strong></TableCell>
                  <TableCell><strong>Meaning</strong></TableCell>
                  <TableCell><strong>Example</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scoreRanges.map((range, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Chip 
                        label={range.range}
                        size="small"
                        sx={{ 
                          backgroundColor: range.color,
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {range.label}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {range.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {range.example}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, p: 2, backgroundColor: 'info.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              💡 <strong>Expert Tip:</strong>
            </Typography>
            <Typography variant="body2">
              Scores above 70% are generally suitable for compliance mapping. Scores below 70% 
              should be reviewed by a compliance expert. The AI considers Australian vs US 
              regulatory contexts, classification systems, and implementation cultures.
            </Typography>
          </Box>

          <Box sx={{ mt: 2, p: 2, backgroundColor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              ⚠️ <strong>Important:</strong>
            </Typography>
            <Typography variant="body2">
              These mappings are AI-generated recommendations. Always validate with qualified 
              compliance professionals before using in official assessments or audits.
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} variant="contained">
            Got it!
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfidenceScoreInfo;