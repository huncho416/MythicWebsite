import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initPerformanceMonitoring, preloadCriticalResources, registerServiceWorker } from './lib/performance'

// Initialize performance monitoring
initPerformanceMonitoring();

// Preload critical resources
preloadCriticalResources();

// Register service worker for caching
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
