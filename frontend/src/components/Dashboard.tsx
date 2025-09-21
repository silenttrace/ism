import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,

} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  Assessment,
  CheckCircle,
  Error,
  Dashboard as DashboardIcon,
  GetApp,
  Menu as MenuIcon,

} from '@mui/icons-material';
import ConfidenceScoreInfo from './ConfidenceScoreInfo';
import { ControlService, ControlLoadingStatus, ProcessingJob, ProcessingMetadata } from '../services/controlService';
import ControlDetailPanel from './ControlDetailPanel';
import NetworkVisualization from './NetworkVisualization';
import ExportReportPanel from './ExportReportPanel';
import LoadingOverlay from './LoadingOverlay';
import HelpSystem, { HelpTrigger } from './HelpSystem';
import SearchBar, { SearchResult } from './SearchBar';
import ScanningAnimation from './ScanningAnimation';
import { useNotification } from './NotificationProvider';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { useKeyboardShortcuts, createCommonShortcuts } from '../hooks/useKeyboardShortcuts';

interface DashboardProps {
  onControlSelect?: (controlId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onControlSelect }) => {
  const [controlStatus, setControlStatus] = useState<ControlLoadingStatus | null>(null);
  const [processingJob, setProcessingJob] = useState<ProcessingJob | null>(null);
  const [metadata, setMetadata] = useState<ProcessingMetadata | null>(null);
  const [selectedControlId, setSelectedControlId] = useState<string | null>(null);
  const [openAIStatus, setOpenAIStatus] = useState<{ connected: boolean; model: string } | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const theme = useTheme();

  const controlService = ControlService.getInstance();
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { handleError } = useErrorHandler();
  
  // Async operations with built-in error handling
  const initialLoadOperation = useAsyncOperation();
  const controlLoadOperation = useAsyncOperation();
  const processingOperation = useAsyncOperation();

  // Keyboard shortcuts
  const shortcuts = createCommonShortcuts({
    onHelp: () => setHelpOpen(true),
    onRefresh: () => loadInitialData(),
    onExport: () => setActiveTab(1),
    onEscape: () => {
      setHelpOpen(false);
      setSelectedControlId(null);
    },
  });

  useKeyboardShortcuts(shortcuts, true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (processingJob && processingJob.status === 'processing') {
      // Check for job status updates every 2 seconds
      const statusInterval = setInterval(() => {
        checkJobStatus(processingJob.id);
      }, 2000);

      // Check for new results every 1 second (queue-based)
      const resultsInterval = setInterval(() => {
        checkForNewResults(processingJob.id);
      }, 1000);

      return () => {
        clearInterval(statusInterval);
        clearInterval(resultsInterval);
      };
    }
  }, [processingJob]);

  const loadInitialData = async () => {
    await initialLoadOperation.execute(async () => {
      // Check control loading status
      const status = await controlService.getLoadingStatus();
      setControlStatus(status);

      // Test AI service connection
      try {
        const aiStatus = await controlService.testAI();
        setOpenAIStatus({ connected: aiStatus.connected, model: aiStatus.stats.model });
      } catch (aiError) {
        console.warn('AI service test failed:', aiError);
        const errorMessage = (aiError && typeof aiError === 'object' && 'message' in aiError) 
          ? (aiError as { message: string }).message 
          : 'Unknown error';
        if (errorMessage.includes('not initialized') || errorMessage.includes('503')) {
          setOpenAIStatus({ connected: false, model: 'AI service not configured' });
          showWarning('AI service not configured. Please check backend configuration.');
        } else {
          setOpenAIStatus({ connected: false, model: 'Connection failed' });
          showWarning('AI service connection failed. Some features may not be available.');
        }
      }

      // Load existing mappings if available
      try {
        const mappings = await controlService.getAllMappings();
        setMetadata(mappings.metadata);
        if (mappings.metadata.processedControls > 0) {
          // Calculate total NIST mappings
          const totalNistMappings = mappings.mappings.reduce((total, mapping) => 
            total + mapping.nistMappings.length, 0
          );
          
          // Get a sample of ISM controls for the message
          const sampleControls = mappings.mappings.slice(0, 3).map(m => m.ismControlId);
          const controlsText = sampleControls.length > 2 
            ? `${sampleControls.slice(0, 2).join(', ')} and ${mappings.metadata.processedControls - 2} others`
            : sampleControls.join(', ');
            
          showInfo(`Found ${totalNistMappings} NIST mappings across ${mappings.metadata.processedControls} ISM controls (${controlsText})`);
        }
      } catch (mappingError) {
        console.log('No existing mappings found');
      }

      return { status, openAIStatus };
    }, {
      errorMessage: 'Failed to load initial data',
      showErrorNotification: true
    });
  };

  const loadControls = async () => {
    await controlLoadOperation.execute(async () => {
      const result = await controlService.loadControls();
      
      // Refresh status
      const status = await controlService.getLoadingStatus();
      setControlStatus(status);

      showSuccess(`Loaded ${result.ismControlCount} ISM controls and ${result.nistControlCount} NIST controls`);
      return result;
    }, {
      showSuccessNotification: false, // We show custom success message above
      errorMessage: 'Failed to load controls',
      showErrorNotification: true
    });
  };

  const startProcessing = async () => {
    await processingOperation.execute(async () => {
      const result = await controlService.startProcessing();
      
      const job: ProcessingJob = {
        id: result.jobId,
        status: 'processing',
        progress: 0,
        totalControls: controlStatus?.ismControlCount || 0,
        processedControls: 0,
        startTime: new Date().toISOString()
      };

      setProcessingJob(job);
      showSuccess(`Started processing ${controlStatus?.ismControlCount || 0} ISM controls`);
      return result;
    }, {
      showSuccessNotification: false, // We show custom success message above
      errorMessage: 'Failed to start processing. Please check AI service connection.',
      showErrorNotification: true
    });
  };

  const checkJobStatus = async (jobId: string) => {
    try {
      const job = await controlService.getJobStatus(jobId);
      setProcessingJob(job);

      // Show completion notification
      if (job.status === 'completed' && processingJob?.status === 'processing') {
        showSuccess(`Processing completed! Mapped ${job.processedControls} controls.`);
      } else if (job.status === 'failed') {
        showError(`Processing failed: ${job.error || 'Unknown error'}`);
      }
    } catch (err) {
      handleError(err, {
        showNotification: false, // Don't show notification for polling errors
        logToConsole: true
      });
    }
  };

  const checkForNewResults = async (jobId: string) => {
    try {
      const response = await controlService.getNewResults(jobId);
      
      if (response.hasNewResults && response.results.length > 0) {
        console.log(`Received ${response.results.length} new results from queue`);
        
        // Update metadata immediately when new results arrive
        const mappings = await controlService.getAllMappings();
        setMetadata(mappings.metadata);
        
        // Show progress update
        showInfo(`Processed ${response.results.length} more controls`);
      }
    } catch (err) {
      // Silently handle queue check errors
      console.debug('Queue check failed:', err);
    }
  };

  const handleControlSelect = (controlId: string) => {
    setSelectedControlId(controlId);
    if (onControlSelect) {
      onControlSelect(controlId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'primary';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const canStartProcessing = controlStatus?.ismControlsLoaded && 
                            controlStatus?.nistControlsLoaded && 
                            openAIStatus?.connected &&
                            (!processingJob || processingJob.status !== 'processing');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleComponentError = (errorMessage: string) => {
    showError(errorMessage);
  };

  const handleComponentSuccess = (message: string) => {
    showSuccess(message);
  };

  const handleResetMappings = async () => {
    if (!window.confirm('Are you sure you want to reset all mappings? This will clear all processed data and cannot be undone.')) {
      return;
    }

    try {
      await controlService.resetMappings();
      
      // Clear local state
      setMetadata(null);
      setProcessingJob(null);
      
      showSuccess('All mappings have been reset successfully');
      
      // Reload initial data
      loadInitialData();
    } catch (error) {
      handleError(error, {
        showNotification: true,
        logToConsole: true
      });
    }
  };

  // Search functionality
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const mappings = await controlService.getAllMappings();
      const results: SearchResult[] = [];
      const queryLower = query.toLowerCase();

      // Search ISM controls by ID and get their details
      mappings.mappings.forEach(mapping => {
        if (mapping.ismControlId.toLowerCase().includes(queryLower)) {
          // Get the highest confidence NIST mapping for subtitle
          const bestMapping = mapping.nistMappings.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );
          
          results.push({
            id: mapping.ismControlId,
            title: mapping.ismControlId,
            subtitle: `Best match: ${bestMapping.nistControlId} (${bestMapping.confidence}%)`,
            type: 'ism',
            confidence: bestMapping.confidence,
            category: 'ISM Control',
          });
        }

        // Search NIST mappings by control ID and title
        mapping.nistMappings.forEach(nistMapping => {
          if (nistMapping.nistControlId.toLowerCase().includes(queryLower) ||
              nistMapping.nistTitle?.toLowerCase().includes(queryLower)) {
            results.push({
              id: `${mapping.ismControlId}->${nistMapping.nistControlId}`,
              title: `${nistMapping.nistControlId} - ${nistMapping.nistTitle}`,
              subtitle: `Mapped from ${mapping.ismControlId} • ${nistMapping.reasoning.substring(0, 80)}...`,
              type: 'nist',
              confidence: nistMapping.confidence,
            });
          }
        });

        // Search in reasoning text for more comprehensive results
        mapping.nistMappings.forEach(nistMapping => {
          if (nistMapping.reasoning.toLowerCase().includes(queryLower) && 
              !results.some(r => r.id === `${mapping.ismControlId}->${nistMapping.nistControlId}`)) {
            results.push({
              id: `${mapping.ismControlId}->${nistMapping.nistControlId}`,
              title: `${mapping.ismControlId} → ${nistMapping.nistControlId}`,
              subtitle: `Found in reasoning: "${nistMapping.reasoning.substring(0, 60)}..."`,
              type: 'mapping',
              confidence: nistMapping.confidence,
            });
          }
        });
      });

      // Sort by confidence and relevance
      results.sort((a, b) => {
        // Exact matches first
        const aExact = a.title.toLowerCase() === queryLower ? 1 : 0;
        const bExact = b.title.toLowerCase() === queryLower ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        // Then by confidence
        return (b.confidence || 0) - (a.confidence || 0);
      });

      setSearchResults(results.slice(0, 15)); // Show more results
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [controlService]);

  const handleSearchResultSelect = (result: SearchResult) => {
    if (result.type === 'ism') {
      // Select the ISM control to show its details
      setSelectedControlId(result.id);
      setActiveTab(0); // Switch to dashboard tab
      showInfo(`Selected ISM control: ${result.id}`);
    } else if (result.type === 'nist') {
      // Extract ISM control ID from the mapping result
      const ismControlId = result.subtitle?.match(/Mapped from (\S+)/)?.[1];
      if (ismControlId) {
        setSelectedControlId(ismControlId);
        setActiveTab(0);
        showInfo(`Viewing ISM control ${ismControlId} and its mapping to ${result.title}`);
      }
    } else if (result.type === 'mapping') {
      // Extract ISM control ID from mapping title
      const ismControlId = result.title.split(' → ')[0];
      if (ismControlId) {
        setSelectedControlId(ismControlId);
        setActiveTab(0);
        showInfo(`Viewing mapping: ${result.title}`);
      }
    }
  };





  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={1} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Typography variant="h6" component="h1" sx={{ mr: 2, fontWeight: 600 }}>
              ISM-NIST Mapper
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-powered compliance mapping tool for Australian ISM to NIST 800-53 controls
            </Typography>
          </Box>

          {/* Search Bar */}
          <Box sx={{ width: 400, mr: 2 }}>
            <SearchBar
              placeholder="Search ISM controls, NIST controls, or mapping content..."
              onSearch={handleSearch}
              onResultSelect={handleSearchResultSelect}
              results={searchResults}
              loading={searchLoading}
            />
          </Box>

          {/* Help Button */}
          <HelpTrigger onClick={() => setHelpOpen(true)} />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        {/* Status Banner */}
        {processingJob && processingJob.status === 'processing' && (
          <ScanningAnimation 
            processedControls={processingJob.processedControls}
            totalControls={processingJob.totalControls}
          />
        )}

        {/* Global loading overlay for major operations */}
        <LoadingOverlay 
          open={initialLoadOperation.loading}
          message="Loading application data..."
          variant="backdrop"
        />

        {/* Show persistent errors that need user attention */}
        {initialLoadOperation.error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => initialLoadOperation.setError(null)}>
            {initialLoadOperation.error}
          </Alert>
        )}

        {/* Tab Navigation */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              icon={<DashboardIcon />} 
              label="Dashboard" 
              iconPosition="start"
            />
            <Tab 
              icon={<GetApp />} 
              label="Export & Reports" 
              iconPosition="start"
              disabled={!metadata || metadata.processedControls === 0}
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
          {/* Status Cards */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Control Status
                </Typography>
                {controlStatus ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {controlStatus.ismControlsLoaded ? (
                        <CheckCircle color="success" sx={{ mr: 1 }} />
                      ) : (
                        <Error color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="body2">
                        ISM Controls: {controlStatus.ismControlCount}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      {controlStatus.nistControlsLoaded ? (
                        <CheckCircle color="success" sx={{ mr: 1 }} />
                      ) : (
                        <Error color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="body2">
                        NIST Controls: {controlStatus.nistControlCount}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      onClick={loadControls}
                      disabled={controlLoadOperation.loading}
                      startIcon={controlLoadOperation.loading ? <CircularProgress size={20} /> : <Refresh />}
                      fullWidth
                    >
                      {controlStatus.ismControlsLoaded ? 'Reload Controls' : 'Load Controls'}
                    </Button>
                  </Box>
                ) : (
                  <CircularProgress size={24} />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  AI Service Status
                </Typography>
                {openAIStatus ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {openAIStatus.connected ? (
                        <CheckCircle color="success" sx={{ mr: 1 }} />
                      ) : (
                        <Error color="error" sx={{ mr: 1 }} />
                      )}
                      <Typography variant="body2">
                        OpenAI: {openAIStatus.connected ? 'Connected' : 'Disconnected'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Model: {openAIStatus.model}
                    </Typography>
                    {!openAIStatus.connected && openAIStatus.model === 'AI service not configured' && (
                      <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
                        Please configure AI service in backend/.env (OpenAI or Ollama)
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <CircularProgress size={24} />
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Processing Status
                </Typography>
                {processingJob ? (
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip 
                        label={processingJob.status}
                        color={getStatusColor(processingJob.status) as any}
                        size="small"
                        sx={{ mr: 1 }}
                      />
                      <Typography variant="body2">
                        {processingJob.processedControls}/{processingJob.totalControls}
                      </Typography>
                    </Box>
                    
                    {processingJob.status === 'processing' && (
                      <Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={processingJob.progress} 
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="caption" color="primary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                          Analyzing ISM controls with Ollama AI...
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Each control is being analyzed for semantic similarity to NIST 800-53 controls. This may take several minutes.
                        </Typography>
                      </Box>
                    )}
                    
                    {processingJob.status === 'queued' && (
                      <Typography variant="caption" color="info.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                        ⏳ Preparing to analyze controls...
                      </Typography>
                    )}
                    
                    {processingJob.error && (
                      <Typography variant="body2" color="error">
                        {processingJob.error}
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No processing job active
                  </Typography>
                )}
                
                <Button
                  variant="contained"
                  onClick={startProcessing}
                  disabled={!canStartProcessing || processingOperation.loading}
                  startIcon={processingOperation.loading ? <CircularProgress size={20} /> : <PlayArrow />}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {processingOperation.loading ? 'Starting...' : 'Start Mapping'}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Results Summary */}
          {metadata && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6">
                        Mapping Results Summary
                      </Typography>
                      {processingJob && processingJob.status === 'processing' && (
                        <Chip 
                          label="Live Updates" 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        variant="outlined"
                        color="warning"
                        size="small"
                        onClick={handleResetMappings}
                        disabled={!metadata || processingJob?.status === 'processing'}
                        sx={{ fontSize: '0.75rem' }}
                      >
                        Reset All
                      </Button>
                      <ConfidenceScoreInfo trigger="chip" size="small" />
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        transition: 'all 0.3s ease-in-out',
                        transform: processingJob?.status === 'processing' ? 'scale(1.02)' : 'scale(1)'
                      }}>
                        <Typography variant="h4" color="primary">
                          {metadata.processedControls}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Processed Controls
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        transition: 'all 0.3s ease-in-out',
                        transform: processingJob?.status === 'processing' ? 'scale(1.02)' : 'scale(1)'
                      }}>
                        <Typography variant="h4" color="success.main">
                          {metadata.highConfidenceMappings}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          High Confidence (≥70%)
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        transition: 'all 0.3s ease-in-out',
                        transform: processingJob?.status === 'processing' ? 'scale(1.02)' : 'scale(1)'
                      }}>
                        <Typography variant="h4" color="info.main">
                          {Math.round(metadata.averageConfidence)}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Average Confidence
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ 
                        transition: 'all 0.3s ease-in-out',
                        transform: processingJob?.status === 'processing' ? 'scale(1.02)' : 'scale(1)'
                      }}>
                        <Typography variant="h4" color="warning.main">
                          {metadata.unmappedControls}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Unmapped Controls
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Visualization */}
          {metadata && metadata.processedControls > 0 && (
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Control Mapping Visualization
                  </Typography>
                  <NetworkVisualization 
                    onNodeClick={handleControlSelect} 
                    refreshTrigger={metadata?.processedControls || 0}
                    isProcessing={processingJob?.status === 'processing'}
                  />
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Control Detail Panel */}
          {selectedControlId && (
            <Grid item xs={12} lg={4}>
              <ControlDetailPanel controlId={selectedControlId} />
            </Grid>
          )}
          </Grid>
        )}

        {/* Export & Reports Tab */}
        {activeTab === 1 && (
          <ExportReportPanel 
            onError={handleComponentError}
            onSuccess={handleComponentSuccess}
          />
        )}

        {/* Help System */}
        <HelpSystem
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          shortcuts={shortcuts}
        />
      </Container>
    </Box>
  );
};

export default Dashboard;