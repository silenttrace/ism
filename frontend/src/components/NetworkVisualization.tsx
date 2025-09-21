import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Chip, 
  Typography,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Slider,
  Paper,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Fullscreen,
  FullscreenExit,
  Settings,

} from '@mui/icons-material';
import { ControlService, MappingResult } from '../services/controlService';
import ConfidenceScoreInfo from './ConfidenceScoreInfo';
import { useMemoizedFilter, useDebounce } from '../hooks/useVirtualization';

interface NetworkVisualizationProps {
  onNodeClick?: (controlId: string) => void;
  refreshTrigger?: number; // Add a prop to trigger refresh
  isProcessing?: boolean; // Add processing state
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: 'ism' | 'nist';
  title: string;
  family?: string;
  confidence?: number;
  mappingCount?: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  confidence: number;
  reasoning: string;
  isManualOverride: boolean;
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ onNodeClick, refreshTrigger, isProcessing }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<Node, Link> | null>(null);
  
  const [mappings, setMappings] = useState<MappingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [selectedFamily, setSelectedFamily] = useState<string>('all');
  const [families, setFamilies] = useState<string[]>([]);
  const [showLabels, setShowLabels] = useState(true);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const theme = useTheme();
  const controlService = ControlService.getInstance();

  // Early returns MUST come before any hooks to avoid hook count mismatch
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <Typography>Loading visualization...</Typography>
      </Box>
    );
  }

  if (mappings.length === 0 && !loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={400}>
        <Typography color="text.secondary">
          No mapping data available. Please run the mapping process first.
        </Typography>
      </Box>
    );
  }

  // Debounce confidence filter for better performance
  const debouncedConfidenceFilter = useDebounce(confidenceFilter, 300);

  useEffect(() => {
    console.log('NetworkVisualization: refreshTrigger changed to:', refreshTrigger);
    loadMappings();
  }, [refreshTrigger]); // Reload when refreshTrigger changes

  // Poll for updates during processing
  useEffect(() => {
    if (isProcessing) {
      const interval = setInterval(() => {
        console.log('NetworkVisualization: Polling for updates during processing');
        loadMappings();
      }, 3000); // Poll every 3 seconds during processing

      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  // Memoized filtered mappings for performance
  const filteredMappings = useMemoizedFilter(
    mappings,
    (mapping) => {
      const hasValidMapping = mapping.nistMappings.some(nm => nm.confidence >= debouncedConfidenceFilter);
      return hasValidMapping;
    },
    [debouncedConfidenceFilter, selectedFamily]
  );

  useEffect(() => {
    if (filteredMappings.length > 0) {
      renderVisualization();
    }
  }, [filteredMappings, showLabels, animationSpeed]);

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, []);

  const loadMappings = async () => {
    try {
      setLoading(true);
      const result = await controlService.getAllMappings();
      console.log('NetworkVisualization: Loaded mappings:', result.mappings.length);
      setMappings(result.mappings);

      // Extract unique families
      const uniqueFamilies = Array.from(new Set(
        result.mappings.map(_m => {
          // We'll need to get the ISM control to get its family
          // For now, we'll use a placeholder
          return 'Security'; // This should be replaced with actual family data
        })
      ));
      setFamilies(uniqueFamilies);

    } catch (error) {
      console.error('Failed to load mappings:', error);
      // Don't show error message during processing, just keep trying
      setMappings([]);
    } finally {
      setLoading(false);
    }
  };

  const renderVisualization = () => {
    if (!svgRef.current || mappings.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const width = 800;
    const height = 600;

    svg.attr('width', width).attr('height', height);

    // Create nodes and links from mappings
    const nodes: Node[] = [];
    const links: Link[] = [];
    const nodeMap = new Map<string, Node>();

    // Filter mappings based on confidence and family
    const filteredMappings = mappings.filter(mapping => {
      const hasValidMapping = mapping.nistMappings.some(nm => nm.confidence >= confidenceFilter);
      // Family filtering would need ISM control data
      return hasValidMapping;
    });

    // Create ISM nodes
    filteredMappings.forEach(mapping => {
      if (!nodeMap.has(mapping.ismControlId)) {
        const ismNode: Node = {
          id: mapping.ismControlId,
          type: 'ism',
          title: mapping.ismControlId, // Would need actual title from control data
          mappingCount: mapping.nistMappings.length
        };
        nodes.push(ismNode);
        nodeMap.set(mapping.ismControlId, ismNode);
      }
    });

    // Create NIST nodes and links
    filteredMappings.forEach(mapping => {
      mapping.nistMappings
        .filter(nm => nm.confidence >= confidenceFilter)
        .forEach(nistMapping => {
          // Create NIST node if it doesn't exist
          if (!nodeMap.has(nistMapping.nistControlId)) {
            const nistNode: Node = {
              id: nistMapping.nistControlId,
              type: 'nist',
              title: nistMapping.nistControlId,
              confidence: nistMapping.confidence
            };
            nodes.push(nistNode);
            nodeMap.set(nistMapping.nistControlId, nistNode);
          }

          // Create link
          links.push({
            source: mapping.ismControlId,
            target: nistMapping.nistControlId,
            confidence: nistMapping.confidence,
            reasoning: nistMapping.reasoning,
            isManualOverride: nistMapping.isManualOverride
          });
        });
    });

    // Create force simulation
    const simulation = d3.forceSimulation<Node>(nodes)
      .force('link', d3.forceLink<Node, Link>(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create container group
    const container = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', d => d.isManualOverride ? '#ff9800' : '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.max(1, d.confidence / 20))
      .attr('stroke-dasharray', d => d.isManualOverride ? '5,5' : 'none');

    // Create nodes
    const node = container.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', d => d.type === 'ism' ? 12 : 8)
      .attr('fill', d => {
        if (d.type === 'ism') return '#1976d2';
        const confidence = d.confidence || 0;
        if (confidence >= 80) return '#4caf50';
        if (confidence >= 70) return '#9c27b0';
        if (confidence >= 50) return '#ff9800';
        return '#f44336';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add labels
    const label = container.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text(d => d.id)
      .attr('font-size', '10px')
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#333')
      .style('pointer-events', 'none');

    // Add click handlers
    node.on('click', (_event, d) => {
      if (d.type === 'ism' && onNodeClick) {
        onNodeClick(d.id);
      }
    });

    // Add tooltips
    node.append('title')
      .text(d => {
        if (d.type === 'ism') {
          return `ISM Control: ${d.id}\nMappings: ${d.mappingCount || 0}`;
        } else {
          return `NIST Control: ${d.id}\nConfidence: ${d.confidence || 0}%`;
        }
      });

    link.append('title')
      .text(d => `Confidence: ${d.confidence}%\n${d.isManualOverride ? 'Manual Override' : 'AI Generated'}`);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      label
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  // Zoom and pan controls
  const handleZoomIn = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = d3.zoom().scaleExtent([0.1, 4]);
      svg.transition().duration(300).call(
        zoom.scaleBy as any, 1.5
      );
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = d3.zoom().scaleExtent([0.1, 4]);
      svg.transition().duration(300).call(
        zoom.scaleBy as any, 0.67
      );
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (svgRef.current) {
      const svg = d3.select(svgRef.current);
      const zoom = d3.zoom().scaleExtent([0.1, 4]);
      svg.transition().duration(500).call(
        zoom.transform as any,
        d3.zoomIdentity
      );
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  return (
    <Box ref={containerRef}>
      {/* User-Friendly Header */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'info.light', borderRadius: 1, color: 'info.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Interactive Control Mapping Network
        </Typography>
        <Typography variant="body2">
          This visualization shows relationships between ISM controls (blue circles) and NIST controls (colored by confidence).
          <strong> Click any ISM control</strong> to view detailed mappings, or use the filters below to focus on specific confidence levels.
        </Typography>
      </Box>

      {/* Enhanced Controls */}
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center', 
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Confidence Filter</InputLabel>
            <Select
              value={confidenceFilter}
              label="Confidence Filter"
              onChange={(e) => setConfidenceFilter(e.target.value as number)}
            >
              <MenuItem value={0}>Show All Mappings (0%+)</MenuItem>
              <MenuItem value={50}>Low Confidence (50%+)</MenuItem>
              <MenuItem value={70}>Medium Confidence (70%+)</MenuItem>
              <MenuItem value={80}>High Confidence (80%+)</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Control Family</InputLabel>
            <Select
              value={selectedFamily}
              label="Control Family"
              onChange={(e) => setSelectedFamily(e.target.value)}
            >
              <MenuItem value="all">All Families</MenuItem>
              {families.map(family => (
                <MenuItem key={family} value={family}>{family}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography variant="caption" sx={{ mr: 1, fontWeight: 'bold' }}>
              Legend:
            </Typography>
            <Chip 
              label="ISM Controls" 
              sx={{ backgroundColor: '#1976d2', color: 'white' }} 
              size="small" 
            />
            <Chip 
              label="High (80%+)" 
              sx={{ backgroundColor: '#4caf50', color: 'white' }} 
              size="small" 
            />
            <Chip 
              label="Medium (70-79%)" 
              sx={{ backgroundColor: '#9c27b0', color: 'white' }} 
              size="small" 
            />
            <Chip 
              label="Low (50-69%)" 
              sx={{ backgroundColor: '#ff9800', color: 'white' }} 
              size="small" 
            />
            <Chip 
              label="Very Low (<50%)" 
              sx={{ backgroundColor: '#f44336', color: 'white' }} 
              size="small" 
            />
            <ConfidenceScoreInfo trigger="icon" size="small" />
          </Box>
        </Box>

        {/* Visualization Controls */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={handleZoomIn}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={handleZoomOut}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset View">
            <IconButton size="small" onClick={handleResetView}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Visualization Settings">
            <IconButton 
              size="small" 
              onClick={() => setSettingsOpen(!settingsOpen)}
              color={settingsOpen ? 'primary' : 'default'}
            >
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Advanced Settings Panel */}
      <Collapse in={settingsOpen}>
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" gutterBottom>
            Visualization Settings
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  size="small"
                />
              }
              label="Show Labels"
            />
            <Box sx={{ minWidth: 200 }}>
              <Typography variant="caption" gutterBottom>
                Animation Speed
              </Typography>
              <Slider
                value={animationSpeed}
                onChange={(_e, value) => setAnimationSpeed(value as number)}
                min={0.1}
                max={2}
                step={0.1}
                size="small"
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}x`}
              />
            </Box>
          </Box>
        </Paper>
      </Collapse>

      {/* Visualization Container */}
      <Box sx={{ 
        border: 1, 
        borderColor: 'divider', 
        borderRadius: 1, 
        overflow: 'hidden',
        position: 'relative',
        height: isFullscreen ? '100vh' : 700,
      }}>
        <svg 
          ref={svgRef} 
          style={{ 
            display: 'block', 
            width: '100%', 
            height: '100%',
            cursor: 'grab'
          }}

        />
        
        {/* Loading Overlay */}
        {loading && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 1,
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Box>Loading...</Box>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Loading visualization...
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      {/* Instructions */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        <strong>Navigation:</strong> Click and drag nodes to explore • Click ISM controls (blue circles) to view details • 
        Use mouse wheel to zoom • Dashed lines indicate manual overrides

      </Typography>


    </Box>
  );
};

export default NetworkVisualization;