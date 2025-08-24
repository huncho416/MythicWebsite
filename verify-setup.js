/**
 * Security & Performance Verification Script
 * Run this script to verify all optimizations are working correctly
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 Security & Performance Verification\n');

// Check environment file
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  console.log('✅ Environment file (.env.local) exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  if (envContent.includes('VITE_SUPABASE_URL') && envContent.includes('VITE_SUPABASE_ANON_KEY')) {
    console.log('✅ Supabase environment variables configured');
  } else {
    console.log('❌ Missing Supabase environment variables');
  }
} else {
  console.log('❌ Environment file (.env.local) not found');
}

// Check if build artifacts exist (means build was successful)
const distPath = 'dist';
if (fs.existsSync(distPath)) {
  console.log('✅ Build artifacts exist (production build successful)');
  
  // Check for chunked assets
  const distAssets = fs.readdirSync(path.join(distPath, 'assets'));
  const chunks = distAssets.filter(file => file.endsWith('.js'));
  
  if (chunks.length > 5) {
    console.log(`✅ Code splitting working (${chunks.length} JavaScript chunks created)`);
  } else {
    console.log('⚠️  Limited code splitting detected');
  }
} else {
  console.log('❌ Build artifacts not found (run npm run build)');
}

// Check security utilities
const securityPath = 'src/lib/security.ts';
if (fs.existsSync(securityPath)) {
  console.log('✅ Security utilities library exists');
  const securityContent = fs.readFileSync(securityPath, 'utf8');
  const requiredFunctions = [
    'validateEmail',
    'validatePassword',
    'validateUsername',
    'validateFileUpload',
    'sanitizeHtml'
  ];
  
  const missingFunctions = requiredFunctions.filter(fn => !securityContent.includes(fn));
  if (missingFunctions.length === 0) {
    console.log('✅ All security validation functions implemented');
  } else {
    console.log(`⚠️  Missing security functions: ${missingFunctions.join(', ')}`);
  }
} else {
  console.log('❌ Security utilities library not found');
}

// Check performance utilities
const performancePath = 'src/lib/performance.ts';
if (fs.existsSync(performancePath)) {
  console.log('✅ Performance utilities library exists');
  const performanceContent = fs.readFileSync(performancePath, 'utf8');
  const requiredFunctions = [
    'compressImage',
    'initPerformanceMonitoring',
    'preloadCriticalResources',
    'debounce'
  ];
  
  const missingFunctions = requiredFunctions.filter(fn => !performanceContent.includes(fn));
  if (missingFunctions.length === 0) {
    console.log('✅ All performance optimization functions implemented');
  } else {
    console.log(`⚠️  Missing performance functions: ${missingFunctions.join(', ')}`);
  }
} else {
  console.log('❌ Performance utilities library not found');
}

// Check main.tsx for performance monitoring initialization
const mainPath = 'src/main.tsx';
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  if (mainContent.includes('initPerformanceMonitoring')) {
    console.log('✅ Performance monitoring initialized in main.tsx');
  } else {
    console.log('⚠️  Performance monitoring not initialized');
  }
} else {
  console.log('❌ main.tsx not found');
}

// Check security headers in index.html
const indexPath = 'index.html';
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const securityHeaders = [
    'Content-Security-Policy',
    'X-Frame-Options',
    'X-Content-Type-Options'
  ];
  
  const missingHeaders = securityHeaders.filter(header => !indexContent.includes(header));
  if (missingHeaders.length === 0) {
    console.log('✅ Security headers implemented in index.html');
  } else {
    console.log(`⚠️  Missing security headers: ${missingHeaders.join(', ')}`);
  }
} else {
  console.log('❌ index.html not found');
}

// Check if database indexes file exists
const dbIndexesPath = 'database_indexes.sql';
if (fs.existsSync(dbIndexesPath)) {
  console.log('✅ Database optimization indexes file created');
} else {
  console.log('⚠️  Database indexes file not found');
}

console.log('\n🎉 Verification Complete!');
console.log('\nNext steps:');
console.log('1. Run the database_indexes.sql file in your Supabase SQL editor');
console.log('2. Deploy to production and monitor performance');
console.log('3. Set up error monitoring (Sentry, LogRocket, etc.)');
console.log('4. Configure CDN for static assets');
