import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Fade,
  Divider,
} from '@mui/material';
import {
  Search,
  Clear,
  FilterList,
} from '@mui/icons-material';
import { useDebounce } from '../hooks/useVirtualization';

export interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: 'ism' | 'nist' | 'mapping';
  confidence?: number;
  category?: string;
}

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  onResultSelect?: (result: SearchResult) => void;
  results?: SearchResult[];
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  showFilters?: boolean;
  filters?: Array<{
    key: string;
    label: string;
    active: boolean;
    onClick: () => void;
  }>;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search controls...",
  onSearch,
  onResultSelect,
  results = [],
  loading = false,
  disabled = false,
  autoFocus = false,
  showFilters = false,
  filters = [],
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      onSearch(debouncedQuery);
      setOpen(true);
    } else {
      setOpen(false);
    }
    setSelectedIndex(-1);
  }, [debouncedQuery, onSearch]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  };

  const handleClear = () => {
    setQuery('');
    setOpen(false);
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        if (open && results.length > 0) {
          event.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        if (open && results.length > 0) {
          event.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (open && selectedIndex >= 0 && results[selectedIndex]) {
          // Select the highlighted result
          handleResultSelect(results[selectedIndex]);
        } else if (query.trim()) {
          // Trigger immediate search if there's a query
          onSearch(query.trim());
          // Force open the results after search
          setTimeout(() => setOpen(true), 100);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setOpen(false);
        setSelectedIndex(-1);
        if (inputRef.current) {
          inputRef.current.blur();
        }
        break;
    }
  };

  const handleResultSelect = (result: SearchResult) => {
    setQuery(result.title);
    setOpen(false);
    setSelectedIndex(-1);
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  const handleClickAway = (event: Event) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as Node)
    ) {
      return;
    }
    setOpen(false);
    setSelectedIndex(-1);
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickAway);
      return () => document.removeEventListener('mousedown', handleClickAway);
    }
  }, [open]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'ism':
        return '🇦🇺';
      case 'nist':
        return '🇺🇸';
      case 'mapping':
        return '🔗';
      default:
        return '📄';
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'default';
    if (confidence >= 80) return 'success';
    if (confidence >= 70) return 'secondary';
    if (confidence >= 50) return 'warning';
    return 'error';
  };

  return (
    <Box ref={anchorRef} sx={{ position: 'relative', width: '100%' }}>
      <TextField
        ref={inputRef}
        fullWidth
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        size="small"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search color={loading ? 'disabled' : 'action'} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {query && (
                <IconButton
                  size="small"
                  onClick={handleClear}
                >
                  <Clear />
                </IconButton>
              )}
              {showFilters && (
                <IconButton
                  size="small"
                  color={filters.some(f => f.active) ? 'primary' : 'default'}
                >
                  <FilterList />
                </IconButton>
              )}
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.paper',
            '&:focus-within': {
              outline: 'none',
              boxShadow: 'none',
            },
            '&.Mui-focused': {
              outline: 'none',
              boxShadow: 'none',
            },
          },
          '& .MuiOutlinedInput-input': {
            '&:focus': {
              outline: 'none',
              boxShadow: 'none',
            },
          },
        }}
      />

      {showFilters && filters.length > 0 && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {filters.map((filter) => (
            <Chip
              key={filter.key}
              label={filter.label}
              size="small"
              variant={filter.active ? 'filled' : 'outlined'}
              color={filter.active ? 'primary' : 'default'}
              onClick={filter.onClick}
              clickable
            />
          ))}
        </Box>
      )}

      <Popper
        open={open && results.length > 0}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        style={{ width: anchorRef.current?.offsetWidth, zIndex: 1300 }}
        transition
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              elevation={8}
              sx={{
                mt: 1,
                maxHeight: 400,
                overflow: 'auto',
                border: 1,
                borderColor: 'divider',
              }}
            >
              <List
                ref={listRef}
                dense
              >
                {results.map((result, index) => (
                  <React.Fragment key={result.id}>
                    <ListItem
                      onClick={() => handleResultSelect(result)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: index === selectedIndex ? 'action.selected' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography component="span" sx={{ fontSize: '1.2em' }}>
                              {getResultIcon(result.type)}
                            </Typography>
                            <Typography variant="body2" component="span">
                              {result.title}
                            </Typography>
                            {result.confidence !== undefined && (
                              <Chip
                                label={`${result.confidence}%`}
                                size="small"
                                color={getConfidenceColor(result.confidence) as any}
                                sx={{ ml: 'auto', fontSize: '0.7rem', height: 20 }}
                              />
                            )}
                          </Box>
                        }
                        secondary={result.subtitle}
                      />
                    </ListItem>
                    {index < results.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>

              {results.length === 0 && query.trim() && !loading && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No results found for "{query}"
                  </Typography>
                </Box>
              )}

              {loading && (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Searching...
                  </Typography>
                </Box>
              )}
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default SearchBar;