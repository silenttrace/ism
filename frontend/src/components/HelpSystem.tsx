import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Help,
  ExpandMore,
  Close,
  Keyboard,
  Info,
  QuestionMark,
  School,
} from '@mui/icons-material';
import { KeyboardShortcut, formatShortcut } from '../hooks/useKeyboardShortcuts';

interface HelpSystemProps {
  open: boolean;
  onClose: () => void;
  shortcuts?: KeyboardShortcut[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      hidden={value !== index}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const HelpSystem: React.FC<HelpSystemProps> = ({ open, onClose, shortcuts = [] }) => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth

    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Help color="primary" />
          <Typography variant="h6">Help & Documentation</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab icon={<School />} label="Getting Started" iconPosition="start" />
          <Tab icon={<Info />} label="Features" iconPosition="start" />
          <Tab icon={<Keyboard />} label="Shortcuts" iconPosition="start" />
          <Tab icon={<QuestionMark />} label="FAQ" iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0, minHeight: 400 }}>
        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>
            Welcome to ISM-NIST Mapper
          </Typography>
          <Typography paragraph>
            This tool helps you map Australian Information Security Manual (ISM) controls to 
            corresponding NIST 800-53 controls using AI-powered semantic analysis.
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">Step 1: Load Control Data</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Click "Load Controls" to fetch the latest ISM controls from the official OSCAL format 
                and load the NIST 800-53 control database. This step is required before mapping.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip label="✓ ISM Controls Loaded" color="success" size="small" />
                <Chip label="✓ NIST Controls Loaded" color="success" size="small" />
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">Step 2: Configure AI Service</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Ensure your AI service (OpenAI or Ollama) is properly configured in the backend. 
                The system will show the connection status on the dashboard.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Note: AI service configuration is done in the backend .env file.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">Step 3: Start Mapping Process</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Click "Start Mapping" to begin the AI analysis. The system will process each ISM control 
                and identify corresponding NIST controls with confidence scores.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processing time depends on the number of controls and AI service response time.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle1">Step 4: Review and Export</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography paragraph>
                Use the interactive visualization to explore mappings, review confidence scores, 
                and make manual adjustments. Export your results in various formats.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Key Features
          </Typography>

          <List>
            <ListItem>
              <ListItemText
                primary="AI-Powered Mapping"
                secondary="Uses advanced language models to analyze control semantics and identify relationships"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Confidence Scoring"
                secondary="Each mapping includes a confidence score (0-100%) to help assess reliability"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Interactive Visualization"
                secondary="Explore control relationships through an interactive network graph with filtering options"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Manual Overrides"
                secondary="Review and adjust AI-generated mappings based on expert knowledge"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Detailed Reasoning"
                secondary="View AI reasoning for each mapping to understand the decision-making process"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemText
                primary="Export & Reporting"
                secondary="Generate comprehensive reports in multiple formats (PDF, Excel, JSON)"
              />
            </ListItem>
          </List>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Confidence Score Guide
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="High (80-100%)" color="success" size="small" />
                <Typography variant="body2">Strong semantic match, high confidence in mapping</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="Medium (70-79%)" color="secondary" size="small" />
                <Typography variant="body2">Good match with some differences, review recommended</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="Low (50-69%)" color="warning" size="small" />
                <Typography variant="body2">Weak match, manual review required</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label="Very Low (<50%)" color="error" size="small" />
                <Typography variant="body2">Poor match, likely needs manual mapping</Typography>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Keyboard Shortcuts
          </Typography>
          
          {Object.keys(groupedShortcuts).length > 0 ? (
            Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <Box key={category} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom color="primary">
                  {category}
                </Typography>
                <List dense>
                  {categoryShortcuts.map((shortcut, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2">{shortcut.description}</Typography>
                            <Chip 
                              label={formatShortcut(shortcut)} 
                              size="small" 
                              variant="outlined"
                              sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))
          ) : (
            <Typography color="text.secondary">
              No keyboard shortcuts are currently configured.
            </Typography>
          )}

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Tip:</strong> Keyboard shortcuts are disabled when typing in input fields.
              Press <Chip label="Esc" size="small" variant="outlined" sx={{ mx: 0.5, fontSize: '0.7rem' }} /> 
              to close dialogs and return focus to the main interface.
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Frequently Asked Questions
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>How accurate are the AI-generated mappings?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Mapping accuracy depends on the AI model and the semantic similarity between controls. 
                High confidence mappings (80%+) are generally reliable, while lower confidence mappings 
                should be reviewed by domain experts. The system provides detailed reasoning to help 
                validate each mapping.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Can I modify the AI-generated mappings?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Yes, you can review and override any AI-generated mapping. Click on a control in the 
                visualization or detail panel to access manual override options. Manual overrides are 
                clearly marked and preserved in exports.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>What export formats are supported?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                The system supports multiple export formats including JSON (for technical integration), 
                Excel/CSV (for analysis), and PDF (for reporting). Each format includes mapping details, 
                confidence scores, and reasoning information.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>How long does the mapping process take?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                Processing time varies based on the number of ISM controls and AI service response time. 
                Typically, it takes 2-5 seconds per control. The system processes controls in batches 
                and shows real-time progress updates.
              </Typography>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>What if the AI service is not available?</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography>
                If the AI service is unavailable, you can still load existing mappings and use manual 
                override features. Check the backend configuration and ensure the AI service (OpenAI or Ollama) 
                is properly set up and accessible.
              </Typography>
            </AccordionDetails>
          </Accordion>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Help trigger component for easy access
export const HelpTrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <Tooltip title="Help & Documentation (F1)">
    <IconButton onClick={onClick} color="primary" size="small">
      <Help />
    </IconButton>
  </Tooltip>
);

export default HelpSystem;