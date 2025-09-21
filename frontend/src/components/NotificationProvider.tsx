import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  Snackbar,
  Alert,
  AlertColor,
  Slide,
  SlideProps
} from '@mui/material';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
  action?: ReactNode;
}

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor, duration?: number, action?: ReactNode) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  hideNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  maxNotifications = 3 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = () => `notification-${Date.now()}-${Math.random()}`;

  const showNotification = (
    message: string, 
    severity: AlertColor = 'info', 
    duration = 6000,
    action?: ReactNode
  ) => {
    const id = generateId();
    const notification: Notification = {
      id,
      message,
      severity,
      duration,
      action
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // Limit the number of notifications
      return newNotifications.slice(0, maxNotifications);
    });

    // Auto-hide notification after duration
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  };

  const showSuccess = (message: string, duration = 4000) => {
    showNotification(message, 'success', duration);
  };

  const showError = (message: string, duration = 8000) => {
    showNotification(message, 'error', duration);
  };

  const showWarning = (message: string, duration = 6000) => {
    showNotification(message, 'warning', duration);
  };

  const showInfo = (message: string, duration = 6000) => {
    showNotification(message, 'info', duration);
  };

  const hideNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const contextValue: NotificationContextType = {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {/* Render notifications */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{
            // Stack notifications vertically
            bottom: `${16 + (index * 70)}px !important`,
            zIndex: 1400 + index
          }}
        >
          <Alert
            severity={notification.severity}
            onClose={() => hideNotification(notification.id)}
            action={notification.action}
            sx={{ minWidth: 300 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;