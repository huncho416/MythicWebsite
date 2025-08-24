import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          query: ['@tanstack/react-query'],
          
          // UI component chunks
          ui: [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover'
          ],
          
          // Admin panel chunk (heavy components)
          admin: [
            './src/components/admin/SimplifiedUserManagement',
            './src/components/admin/EnhancedStoreManagement',
            './src/components/admin/ForumManagement',
            './src/components/admin/RoleManagement',
            './src/components/admin/SupportManagement',
            './src/components/admin/OrderManagement'
          ],
          
          // Supabase chunk
          supabase: ['@supabase/supabase-js'],
          
          // Date utilities
          date: ['date-fns'],
          
          // Icons (split heavy icon imports)
          icons: ['lucide-react']
        }
      }
    },
    // Optimize chunk size warning limit
    chunkSizeWarningLimit: 600,
    
    // Enable source maps for production debugging (optional)
    sourcemap: mode === 'development',
    
    // Minify options - use esbuild for faster builds
    minify: mode === 'production' ? 'esbuild' : false,
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js'
    ],
  },
}));
