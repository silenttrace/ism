import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled: boolean = true) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrlKey === event.ctrlKey;
      const altMatch = !!shortcut.altKey === event.altKey;
      const shiftMatch = !!shortcut.shiftKey === event.shiftKey;
      const metaMatch = !!shortcut.metaKey === event.metaKey;

      return keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch;
    });

    if (matchingShortcut) {
      event.preventDefault();
      matchingShortcut.action();
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return shortcuts;
};

// Common keyboard shortcuts
export const createCommonShortcuts = (actions: {
  onHelp?: () => void;
  onRefresh?: () => void;
  onExport?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
}): KeyboardShortcut[] => [
  {
    key: 'F1',
    action: actions.onHelp || (() => {}),
    description: 'Show help',
    category: 'General',
  },
  {
    key: 'r',
    ctrlKey: true,
    action: actions.onRefresh || (() => {}),
    description: 'Refresh data',
    category: 'General',
  },
  {
    key: 'e',
    ctrlKey: true,
    action: actions.onExport || (() => {}),
    description: 'Export data',
    category: 'General',
  },
  {
    key: 'f',
    ctrlKey: true,
    action: actions.onSearch || (() => {}),
    description: 'Search controls',
    category: 'Navigation',
  },
  {
    key: 'Escape',
    action: actions.onEscape || (() => {}),
    description: 'Close dialogs/panels',
    category: 'Navigation',
  },
  {
    key: '?',
    shiftKey: true,
    action: actions.onHelp || (() => {}),
    description: 'Show keyboard shortcuts',
    category: 'General',
  },
];

export const formatShortcut = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.metaKey) parts.push('Cmd');
  
  parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};