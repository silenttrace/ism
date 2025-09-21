import React from 'react';
import { ThemeProvider, createTheme, responsiveFontSizes } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationProvider from './components/NotificationProvider';

// Enhanced theme with responsive design and branding
let theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Australian Government Blue
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e', // Accent red for important actions
      light: '#ff5983',
      dark: '#9a0036',
      contrastText: '#ffffff',
    },
    success: {
      main: '#2e7d32', // Green for high confidence
      light: '#4caf50',
      dark: '#1b5e20',
    },
    warning: {
      main: '#ed6c02', // Orange for medium confidence
      light: '#ff9800',
      dark: '#e65100',
    },
    error: {
      main: '#d32f2f', // Red for low confidence
      light: '#f44336',
      dark: '#c62828',
    },
    info: {
      main: '#0288d1', // Info blue
      light: '#03a9f4',
      dark: '#01579b',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 300,
      fontSize: '3.5rem',
    },
    h2: {
      fontWeight: 300,
      fontSize: '2.75rem',
    },
    h3: {
      fontWeight: 400,
      fontSize: '2.25rem',
    },
    h4: {
      fontWeight: 400,
      fontSize: '1.75rem',
    },
    h5: {
      fontWeight: 400,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 500,
      fontSize: '1.25rem',
    },
    subtitle1: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.75,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.43,
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none', // More modern look
    },
    caption: {
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.66,
    },
  },
  shape: {
    borderRadius: 8, // Slightly more rounded corners
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12)',
          '&:hover': {
            boxShadow: '0px 3px 3px -2px rgba(0,0,0,0.2), 0px 3px 4px 0px rgba(0,0,0,0.14), 0px 1px 8px 0px rgba(0,0,0,0.12)',
          },
          transition: 'box-shadow 0.3s ease-in-out',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 48,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(97, 97, 97, 0.92)',
          fontSize: '0.75rem',
          borderRadius: 4,
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Make typography responsive
theme = responsiveFontSizes(theme);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <NotificationProvider>
          <Box sx={{ 
            minHeight: '100vh',
            backgroundImage: 'url(/Background.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
          }}>
            <Dashboard />
          </Box>
        </NotificationProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;