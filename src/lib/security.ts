/**
 * Security utilities for input validation and sanitization
 */

/**
 * Validates username format
 */
export const validateUsername = (username: string): { isValid: boolean; error?: string } => {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Username must be no more than 20 characters long' };
  }
  
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  return { isValid: true };
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

/**
 * Validates password strength
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string; strength: number } => {
  if (!password) {
    return { isValid: false, error: 'Password is required', strength: 0 };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long', strength: 1 };
  }
  
  let strength = 0;
  
  // Check for lowercase
  if (/[a-z]/.test(password)) strength++;
  
  // Check for uppercase
  if (/[A-Z]/.test(password)) strength++;
  
  // Check for numbers
  if (/\d/.test(password)) strength++;
  
  // Check for special characters
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
  
  // Check length bonus
  if (password.length >= 12) strength++;
  
  if (strength < 3) {
    return { 
      isValid: false, 
      error: 'Password should contain at least 3 of: lowercase, uppercase, numbers, special characters',
      strength 
    };
  }
  
  return { isValid: true, strength };
};

/**
 * Validates file upload
 */
export const validateFileUpload = (
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { isValid: boolean; error?: string } => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;
  
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }
  
  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}` };
  }
  
  return { isValid: true };
};

/**
 * Sanitizes HTML content to prevent XSS
 * Note: This is a basic implementation. For production, use a library like DOMPurify
 */
export const sanitizeHtml = (input: string): string => {
  if (!input) return '';
  
  // Basic HTML escape
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validates URL format
 */
export const validateUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url) {
    return { isValid: true }; // URL is optional in most cases
  }
  
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
};

/**
 * Validates color hex format
 */
export const validateHexColor = (color: string): { isValid: boolean; error?: string } => {
  if (!color) {
    return { isValid: false, error: 'Color is required' };
  }
  
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  if (!hexRegex.test(color)) {
    return { isValid: false, error: 'Please enter a valid hex color (e.g., #FF0000)' };
  }
  
  return { isValid: true };
};

/**
 * Validates numeric input within range
 */
export const validateNumber = (
  value: number,
  options: { min?: number; max?: number; integer?: boolean } = {}
): { isValid: boolean; error?: string } => {
  const { min, max, integer = false } = options;
  
  if (isNaN(value)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }
  
  if (integer && !Number.isInteger(value)) {
    return { isValid: false, error: 'Please enter a whole number' };
  }
  
  if (min !== undefined && value < min) {
    return { isValid: false, error: `Value must be at least ${min}` };
  }
  
  if (max !== undefined && value > max) {
    return { isValid: false, error: `Value must be no more than ${max}` };
  }
  
  return { isValid: true };
};

/**
 * Rate limiting utility for client-side requests
 */
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);
    
    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (attempt.count >= maxAttempts) {
      return false;
    }
    
    attempt.count++;
    return true;
  }
  
  getRemainingTime(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt) return 0;
    
    return Math.max(0, attempt.resetTime - Date.now());
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Debounce utility for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
