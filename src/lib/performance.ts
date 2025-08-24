/**
 * Performance optimization utilities
 */

/**
 * Image compression utility
 */
export const compressImage = async (
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'webp' | 'png';
  } = {}
): Promise<File> => {
  const {
    maxWidth = 800,
    maxHeight = 600,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      const mimeType = `image/${format}`;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now()
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        mimeType,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Lazy loading hook for images
 */
export const useLazyLoading = () => {
  const observerRef = React.useRef<IntersectionObserver>();

  React.useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              observerRef.current?.unobserve(img);
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => observerRef.current?.disconnect();
  }, []);

  const observeImage = React.useCallback((img: HTMLImageElement | null) => {
    if (img && observerRef.current) {
      observerRef.current.observe(img);
    }
  }, []);

  return observeImage;
};

/**
 * Virtual scrolling utility for large lists
 */
export const useVirtualScroll = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length - 1
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    setScrollTop
  };
};

/**
 * Memoization utility for expensive calculations
 */
export const useMemoizedValue = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return React.useMemo(factory, deps);
};

/**
 * Debounced search hook
 */
export const useDebouncedSearch = (
  searchFn: (query: string) => void,
  delay: number = 300
) => {
  const [query, setQuery] = React.useState('');
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (query.trim()) {
        searchFn(query);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, searchFn, delay]);

  return [query, setQuery] as const;
};

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {}
) => {
  const elementRef = React.useRef<HTMLElement>();

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => callback(entry.isIntersecting),
      options
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [callback, options]);

  return elementRef;
};

/**
 * Web Vitals monitoring
 */
export const initPerformanceMonitoring = () => {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  // Performance observer for monitoring
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        console.log('Navigation Timing:', {
          DNS: navEntry.domainLookupEnd - navEntry.domainLookupStart,
          TCP: navEntry.connectEnd - navEntry.connectStart,
          Request: navEntry.responseStart - navEntry.requestStart,
          Response: navEntry.responseEnd - navEntry.responseStart,
          DOM: navEntry.domContentLoadedEventEnd - navEntry.responseEnd,
          Load: navEntry.loadEventEnd - navEntry.domContentLoadedEventEnd
        });
      }
    }
  });

  observer.observe({ entryTypes: ['navigation', 'measure'] });

  // Monitor Core Web Vitals
  const reportVital = (metric: any) => {
    console.log(`${metric.name}: ${metric.value}`);
    
    // Send to analytics (replace with your analytics service)
    // analytics.track('Web Vital', {
    //   metric: metric.name,
    //   value: metric.value,
    //   url: window.location.pathname
    // });
  };

  // Dynamically import Web Vitals library if available
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(reportVital);
    getFID(reportVital);
    getFCP(reportVital);
    getLCP(reportVital);
    getTTFB(reportVital);
  }).catch(() => {
    console.log('Web Vitals library not available');
  });
};

/**
 * Preload critical resources
 */
export const preloadCriticalResources = () => {
  if (typeof window === 'undefined') return;

  // Preload critical images
  const criticalImages = [
    '/logo.png',
    '/banner.jpg',
    '/avatar.png'
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });

  // Preload fonts
  const criticalFonts = [
    'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Oxanium:wght@300;400;600;700&display=swap'
  ];

  criticalFonts.forEach(href => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  });
};

/**
 * Service Worker registration for caching
 */
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    
    // Update available
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Show update available notification
            console.log('New version available! Please refresh.');
          }
        });
      }
    });
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

/**
 * Bundle size analyzer (development only)
 */
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;

  // This runs only in development to help identify large imports
  const performanceEntries = performance.getEntriesByType('navigation');
  const navigation = performanceEntries[0] as PerformanceNavigationTiming;

  console.log('Bundle Analysis:', {
    transferSize: navigation.transferSize,
    encodedBodySize: navigation.encodedBodySize,
    decodedBodySize: navigation.decodedBodySize,
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart
  });
};

/**
 * Debounce utility function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number = 300
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

/**
 * React imports for hooks
 */
import React from 'react';
