import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  fps: number;
  isSlowDevice: boolean;
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    fps: 60,
    isSlowDevice: false,
  });

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderStartTime = useRef(0);

  // Measure render performance
  const startRenderMeasure = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderMeasure = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setMetrics(prev => ({ ...prev, renderTime }));
  }, []);

  // Monitor FPS
  useEffect(() => {
    let animationId: number;

    const measureFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime.current + 1000) {
        const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));
        const isSlowDevice = fps < 30;
        
        setMetrics(prev => ({ 
          ...prev, 
          fps,
          isSlowDevice,
        }));

        frameCount.current = 0;
        lastTime.current = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  // Monitor memory usage (if available)
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024, // MB
        }));
      }
    };

    const interval = setInterval(measureMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    startRenderMeasure,
    endRenderMeasure,
  };
};

// Hook for adaptive performance settings
export const useAdaptivePerformance = () => {
  const { metrics } = usePerformanceMonitor();
  const [settings, setSettings] = useState({
    enableAnimations: true,
    maxVisibleNodes: 1000,
    updateInterval: 100,
    enableLabels: true,
  });

  useEffect(() => {
    if (metrics.isSlowDevice || metrics.fps < 30) {
      setSettings({
        enableAnimations: false,
        maxVisibleNodes: 500,
        updateInterval: 200,
        enableLabels: false,
      });
    } else if (metrics.fps > 50) {
      setSettings({
        enableAnimations: true,
        maxVisibleNodes: 2000,
        updateInterval: 50,
        enableLabels: true,
      });
    }
  }, [metrics.isSlowDevice, metrics.fps]);

  return settings;
};

// Hook for lazy loading with intersection observer
export const useLazyLoad = (threshold: number = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      { threshold }
    );

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [threshold, hasLoaded]);

  return { elementRef, isVisible, hasLoaded };
};

// Hook for debounced resize handling
export const useResizeObserver = (callback: (entry: ResizeObserverEntry) => void) => {
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        callback(entry);
      }
    });

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [callback]);

  return elementRef;
};

// Hook for performance-aware data processing
export const usePerformantDataProcessing = <T, R>(
  data: T[],
  processFn: (item: T) => R,
  batchSize: number = 100
) => {
  const [processedData, setProcessedData] = useState<R[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (data.length === 0) {
      setProcessedData([]);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    const results: R[] = [];

    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + batchSize, data.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        results.push(processFn(data[i]));
      }

      const newProgress = (endIndex / data.length) * 100;
      setProgress(newProgress);

      if (endIndex < data.length) {
        // Use setTimeout to yield control back to the browser
        setTimeout(() => processBatch(endIndex), 0);
      } else {
        setProcessedData(results);
        setIsProcessing(false);
        setProgress(100);
      }
    };

    processBatch(0);
  }, [data, processFn, batchSize]);

  return { processedData, isProcessing, progress };
};