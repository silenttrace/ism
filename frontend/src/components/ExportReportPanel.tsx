import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Stack,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  Paper
} from '@mui/material';
import {
  Download,
  Assessment,
  PictureAsPdf,
  TableChart,
  Code,
  Visibility
} from '@mui/icons-material';
import { ControlService, SummaryStats, ExportFormat, ReportPreview, ExportOptions } from '../services/controlService';

interface ExportReportPanelProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

const ExportReportPanel: React.FC<ExportReportPanelProps> = ({ onError, onSuccess }) => {
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>([]);
  const [reportPreview, setReportPreview] = useState<ReportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeReasoning: true,
    confidenceThreshold: undefined,
    controlFamilies: []
  });
  const [availableFamilies, setAvailableFamilies] = useState<string[]>([]);

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
    loadInitialData();
  }, []);

  useEffect(() => {
    if (summaryStats) {
      loadReportPreview();
    }
  }, [exportOptions, summaryStats]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load summary stats, export formats, and control families in parallel
      const [stats, formats, families] = await Promise.all([
        controlService.getSummaryStats(),
        controlService.getExportFormats(),
        controlService.getControlFamilies()
      ]);

      setSummaryStats(stats);
      setExportFormats(formats.formats);
      setAvailableFamilies(families.nist); // Use NIST families for filtering
      
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const loadReportPreview = async () => {
    try {
      setPreviewLoading(true);
      const preview = await controlService.previewReport({
        confidenceThreshold: exportOptions.confidenceThreshold,
        controlFamilies: exportOptions.controlFamilies,
        limit: 5
      });
      setReportPreview(preview);
    } catch (error) {
      console.error('Failed to load preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      await controlService.downloadReport(selectedFormat, exportOptions);
      onSuccess(`Report exported successfully as ${selectedFormat.toUpperCase()}`);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyChange = (families: string[]) => {
    setExportOptions(prev => ({
      ...prev,
      controlFamilies: families
    }));
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <PictureAsPdf />;
      case 'csv': return <TableChart />;
      case 'json': return <Code />;
      default: return <Download />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'success';
    if (confidence >= 70) return 'warning';
    return 'error';
  };

  if (loading && !summaryStats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
        Export & Reporting
      </Typography>

      {summaryStats && (
        <Grid container spacing={3}>
          {/* Summary Statistics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Summary Statistics</Typography>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Total ISM Controls:</Typography>
                    <Typography fontWeight="bold">{summaryStats.totalISMControls}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Total Mappings:</Typography>
                    <Typography fontWeight="bold">{summaryStats.totalMappings}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Manual Overrides:</Typography>
                    <Typography fontWeight="bold">{summaryStats.manualOverrides}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography>Avg Processing Time:</Typography>
                    <Typography fontWeight="bold">{formatProcessingTime(summaryStats.averageProcessingTime)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Confidence Distribution */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Confidence Distribution</Typography>
                <Stack spacing={1}>
                  {Object.entries(summaryStats.confidenceDistribution).map(([range, count]) => {
                    const percentage = summaryStats.totalMappings > 0 
                      ? ((count / summaryStats.totalMappings) * 100).toFixed(1) 
                      : '0.0';
                    return (
                      <Box key={range} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2">{range}:</Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2">{count}</Typography>
                          <Typography variant="caption" color="text.secondary">({percentage}%)</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Export Options */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Export Options</Typography>
                
                <Grid container spacing={3}>
                  {/* Format Selection */}
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Export Format</InputLabel>
                      <Select
                        value={selectedFormat}
                        label="Export Format"
                        onChange={(e) => setSelectedFormat(e.target.value as 'json' | 'csv' | 'pdf')}
                      >
                        {exportFormats.map((format) => (
                          <MenuItem key={format.format} value={format.format}>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getFormatIcon(format.format)}
                              {format.format.toUpperCase()}
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Confidence Threshold */}
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Min Confidence Threshold"
                      type="number"
                      inputProps={{ min: 0, max: 100 }}
                      value={exportOptions.confidenceThreshold || ''}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        confidenceThreshold: e.target.value ? Number(e.target.value) : undefined
                      }))}
                      helperText="Filter mappings by minimum confidence score"
                    />
                  </Grid>

                  {/* Include Reasoning */}
                  <Grid item xs={12} md={4}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={exportOptions.includeReasoning || false}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeReasoning: e.target.checked
                          }))}
                        />
                      }
                      label="Include Reasoning"
                    />
                  </Grid>

                  {/* Control Families Filter */}
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Filter by Control Families (Optional)</InputLabel>
                      <Select
                        multiple
                        value={exportOptions.controlFamilies || []}
                        label="Filter by Control Families (Optional)"
                        onChange={(e) => handleFamilyChange(e.target.value as string[])}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {availableFamilies.map((family) => (
                          <MenuItem key={family} value={family}>
                            {family}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                {/* Format Description */}
                {exportFormats.find(f => f.format === selectedFormat) && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">
                      {exportFormats.find(f => f.format === selectedFormat)?.description}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Features: {exportFormats.find(f => f.format === selectedFormat)?.features.join(', ')}
                    </Typography>
                  </Alert>
                )}

                {/* Export Button */}
                <Box display="flex" justifyContent="center">
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} /> : <Download />}
                    onClick={handleExport}
                    disabled={loading || !summaryStats || summaryStats.totalMappings === 0}
                  >
                    {loading ? 'Generating...' : `Export as ${selectedFormat.toUpperCase()}`}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Report Preview */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Visibility />
                  <Typography variant="h6">Report Preview</Typography>
                  {previewLoading && <CircularProgress size={20} />}
                </Box>

                {reportPreview && (
                  <>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Showing first {reportPreview.showingFirst} of {reportPreview.filteredMappings} filtered mappings 
                      (Total: {reportPreview.totalMappings})
                    </Alert>

                    <Stack spacing={2}>
                      {reportPreview.preview.map((item, index) => (
                        <Paper key={item.ismControl.id} sx={{ p: 2 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {index + 1}. {item.ismControl.id} - {item.ismControl.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            Family: {item.ismControl.family}
                          </Typography>
                          
                          <Stack spacing={2} sx={{ mt: 1 }}>
                            {item.nistMappings.map((mapping, mIndex) => (
                              <Box key={mapping.nistControlId} sx={{ pl: 2, borderLeft: 2, borderColor: 'divider' }}>
                                <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {String.fromCharCode(97 + mIndex)}. {mapping.nistControlId} - {mapping.nistTitle}
                                  </Typography>
                                  <Chip
                                    label={`${mapping.confidence}%`}
                                    size="small"
                                    color={getConfidenceColor(mapping.confidence)}
                                  />
                                  {mapping.isManualOverride && (
                                    <Chip label="Manual" size="small" color="info" />
                                  )}
                                </Box>
                                
                                {/* NIST Control Description */}
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontStyle: 'italic' }}>
                                  {mapping.nistDescription}
                                </Typography>
                                
                                {/* AI Reasoning */}
                                {exportOptions.includeReasoning && mapping.reasoning && (
                                  <Typography variant="body2" color="text.secondary" sx={{ 
                                    backgroundColor: 'grey.50', 
                                    p: 1, 
                                    borderRadius: 1,
                                    fontSize: '0.875rem'
                                  }}>
                                    <strong>Reasoning:</strong> {mapping.reasoning}
                                  </Typography>
                                )}
                              </Box>
                            ))}
                          </Stack>
                          
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            Processing time: {formatProcessingTime(item.processingTime)}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </>
                )}

                {!reportPreview && !previewLoading && (
                  <Alert severity="warning">
                    No mapping data available for preview. Please run the mapping process first.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {!summaryStats && !loading && (
        <Alert severity="warning">
          No mapping data available. Please run the mapping process first to generate reports.
        </Alert>
      )}
    </Box>
  );
};

export default ExportReportPanel;