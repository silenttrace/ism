import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Slider,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Edit,
  Save,
  Cancel,
  TrendingUp,
  TrendingDown,
  Remove
} from '@mui/icons-material';
import ConfidenceScoreInfo from './ConfidenceScoreInfo';
import ConfidenceThresholdBar from './ConfidenceThresholdBar';
import { ControlService, MappingResult, ISMControl } from '../services/controlService';

interface ControlDetailPanelProps {
  controlId: string;
}

const ControlDetailPanel: React.FC<ControlDetailPanelProps> = ({ controlId }) => {
  const [mapping, setMapping] = useState<MappingResult | null>(null);
  const [ismControl, setIsmControl] = useState<ISMControl | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<{
    nistControlId: string;
    confidence: number;
    reasoning: string;
  } | null>(null);

  const controlService = ControlService.getInstance();

  const formatProcessingTime = (timeMs: number): string => {
    if (timeMs < 1000) {
      return `${timeMs.toFixed(0)}ms`;
    } else if (timeMs < 60000) {
      return `${(timeMs / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(timeMs / 60000);
      const seconds = Math.floor((timeMs % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
  };

  useEffect(() => {
    if (controlId) {
      loadControlDetails();
    }
  }, [controlId]);

  const loadControlDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load ISM control details
      const control = await controlService.getISMControlById(controlId);
      setIsmControl(control);

      // Load mapping if it exists
      try {
        const mappingResult = await controlService.getMappingByControlId(controlId);
        setMapping(mappingResult);
      } catch (mappingError) {
        // Mapping might not exist yet
        setMapping(null);
      }

    } catch (err) {
      const errorMessage = (err && typeof err === 'object' && 'message' in err) 
        ? (err as { message: string }).message 
        : 'Failed to load control details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMapping = (nistControlId: string, confidence: number, reasoning: string) => {
    setEditingMapping({ nistControlId, confidence, reasoning });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMapping) return;

    try {
      await controlService.applyManualOverride(
        controlId,
        editingMapping.nistControlId,
        editingMapping.confidence,
        editingMapping.reasoning
      );

      // Reload the mapping
      await loadControlDetails();
      setEditDialogOpen(false);
      setEditingMapping(null);
    } catch (err) {
      const errorMessage = (err && typeof err === 'object' && 'message' in err) 
        ? (err as { message: string }).message 
        : 'Failed to save manual override';
      setError(errorMessage);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'success';
    if (confidence >= 70) return 'secondary'; // Purple color for medium confidence
    if (confidence >= 50) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 70) return <TrendingUp />;
    if (confidence >= 50) return <Remove />;
    return <TrendingDown />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!ismControl) {
    return (
      <Card>
        <CardContent>
          <Typography variant="body1" color="text.secondary">
            Select a control to view details
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {ismControl.id}: {ismControl.title}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Chip 
              label={ismControl.controlFamily} 
              size="small" 
              sx={{ mr: 1 }} 
            />
            <Chip 
              label={ismControl.riskLevel} 
              size="small" 
              color={ismControl.riskLevel === 'HIGH' ? 'error' : 
                     ismControl.riskLevel === 'MEDIUM' ? 'warning' : 'success'}
            />
          </Box>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Description</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                {ismControl.description}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Implementation Guidance</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2">
                {ismControl.implementationGuidance || 'No implementation guidance available'}
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              NIST Mappings
            </Typography>
            <ConfidenceScoreInfo trigger="icon" size="small" />
          </Box>

          {mapping && mapping.nistMappings.length > 0 ? (
            mapping.nistMappings.map((nistMapping, index) => (
              <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {nistMapping.nistControlId}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {nistMapping.nistTitle}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        icon={getConfidenceIcon(nistMapping.confidence)}
                        label={`${nistMapping.confidence}%`}
                        color={getConfidenceColor(nistMapping.confidence) as any}
                        size="small"
                        sx={{
                          // Highlight low-confidence mappings
                          ...(nistMapping.confidence < 70 && {
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%': { opacity: 1 },
                              '50%': { opacity: 0.7 },
                              '100%': { opacity: 1 }
                            }
                          })
                        }}
                      />
                      {nistMapping.isManualOverride && (
                        <Chip label="Manual" size="small" color="secondary" />
                      )}
                      {nistMapping.confidence < 70 && (
                        <Chip 
                          label="Review Needed" 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Confidence Visualization */}
                  <Box sx={{ mb: 2 }}>
                    <ConfidenceThresholdBar 
                      confidence={nistMapping.confidence} 
                      size="medium"
                    />
                  </Box>

                  {/* NIST Control Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    mb: 2, 
                    p: 1.5, 
                    backgroundColor: 'grey.50', 
                    borderRadius: 1,
                    fontStyle: 'italic'
                  }}>
                    {nistMapping.nistDescription}
                  </Typography>

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2">AI Analysis & Reasoning</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6 }}>
                        {nistMapping.reasoning}
                      </Typography>
                      <Button
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleEditMapping(
                          nistMapping.nistControlId,
                          nistMapping.confidence,
                          nistMapping.reasoning
                        )}
                      >
                        Edit Mapping
                      </Button>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            ))
          ) : (
            <Alert severity="info">
              No mappings found for this control. Start processing to generate mappings.
            </Alert>
          )}

          {mapping && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary">
                Processed: {new Date(mapping.processingTimestamp).toLocaleString()}
              </Typography>
              <br />
              <Typography variant="caption" color="text.secondary">
                Model: {mapping.aiModel} | Processing time: {formatProcessingTime(mapping.processingTime)}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Mapping</DialogTitle>
        <DialogContent>
          {editingMapping && (
            <Box sx={{ pt: 1 }}>
              <TextField
                fullWidth
                label="NIST Control ID"
                value={editingMapping.nistControlId}
                onChange={(e) => setEditingMapping({
                  ...editingMapping,
                  nistControlId: e.target.value
                })}
                sx={{ mb: 3 }}
              />

              <Typography gutterBottom>
                Confidence Score: {editingMapping.confidence}%
              </Typography>
              <Slider
                value={editingMapping.confidence}
                onChange={(_, value) => setEditingMapping({
                  ...editingMapping,
                  confidence: value as number
                })}
                min={0}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reasoning"
                value={editingMapping.reasoning}
                onChange={(e) => setEditingMapping({
                  ...editingMapping,
                  reasoning: e.target.value
                })}
                helperText="Explain why this mapping is appropriate and any key similarities or differences."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" startIcon={<Save />}>
            Save Override
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ControlDetailPanel;