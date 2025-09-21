import { useState, useEffect, useMemo, useCallback } from 'react';

export interface VirtualizationOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  threshold?: number;
}

export interface VirtualizedData<T> {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetY: number;
}

export const useVirtualization = <T>(
  items: T[],
  options: VirtualizationOptions
): VirtualizedData<T> & {
  scrollElementProps: {
    onScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    style: React.CSSProperties;
  };
  containerProps: {
    style: React.CSSProperties;
  };
} => {
  const { itemHeight, containerHeight, overscan = 5, threshold = 100 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  // Only virtualize if we have enough items
  const shouldVirtualize = items.length > threshold;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  const virtualizedData = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        visibleItems: items,
        startIndex: 0,
        endIndex: items.length - 1,
        totalHeight: items.length * itemHeight,
        offsetY: 0,
      };
    }

    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      visibleStart + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(items.length - 1, visibleEnd + overscan);

    const visibleItems = items.slice(startIndex, endIndex + 1);
    const offsetY = startIndex * itemHeight;
    const totalHeight = items.length * itemHeight;

    return {
      visibleItems,
      startIndex,
      endIndex,
      totalHeight,
      offsetY,
    };
  }, [items, itemHeight, containerHeight, scrollTop, overscan, shouldVirtualize]);

  return {
    ...virtualizedData,
    scrollElementProps: {
      onScroll: handleScroll,
      style: {
        height: containerHeight,
        overflow: 'auto',
      },
    },
    containerProps: {
      style: {
        height: virtualizedData.totalHeight,
        position: 'relative',
      },
    },
  };
};

// Hook for debouncing search/filter operations
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook for memoizing expensive computations
export const useMemoizedFilter = <T>(
  items: T[],
  filterFn: (item: T) => boolean,
  dependencies: React.DependencyList
): T[] => {
  return useMemo(() => {
    return items.filter(filterFn);
  }, [items, ...dependencies]);
};

// Hook for lazy loading data
export const useLazyLoading = <T>(
  loadFn: (page: number, pageSize: number) => Promise<T[]>,
  pageSize: number = 50
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const newItems = await loadFn(page, pageSize);
      
      if (newItems.length < pageSize) {
        setHasMore(false);
      }

      setData(prev => [...prev, ...newItems]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more data:', error);
    } finally {
      setLoading(false);
    }
  }, [loadFn, page, pageSize, loading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setPage(0);
    setHasMore(true);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reset,
  };
};