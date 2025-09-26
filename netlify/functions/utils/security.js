const crypto = require('crypto');

/**
 * Security utilities for API endpoints
 */

// Rate limiting store (in production, use Redis or database)
const rateLimitStore = new Map();

/**
 * Generate secure UUID for property IDs
 */
const generateSecureId = () => {
  return crypto.randomUUID();
};

/**
 * Validate and sanitize string input
 */
const sanitizeString = (input, maxLength = 1000) => {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  
  if (input.length > maxLength) {
    throw new Error(`Input exceeds maximum length of ${maxLength} characters`);
  }
  
  // Remove potential XSS and injection characters
  return input
    .replace(/[<>\"'%;()&+]/g, '') // Basic XSS prevention
    .trim();
};

/**
 * Validate numeric input
 */
const validateNumber = (input, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const num = parseFloat(input);
  
  if (isNaN(num)) {
    throw new Error('Input must be a valid number');
  }
  
  if (num < min || num > max) {
    throw new Error(`Number must be between ${min} and ${max}`);
  }
  
  return num;
};

/**
 * Rate limiting middleware
 */
const checkRateLimit = (clientId, maxRequests = 100, windowMs = 60000) => {
  const now = Date.now();
  const key = `${clientId}:${Math.floor(now / windowMs)}`;
  
  const current = rateLimitStore.get(key) || 0;
  
  if (current >= maxRequests) {
    throw new Error('Rate limit exceeded');
  }
  
  rateLimitStore.set(key, current + 1);
  
  // Cleanup old entries
  for (const [k, v] of rateLimitStore.entries()) {
    const keyTime = parseInt(k.split(':')[1]) * windowMs;
    if (now - keyTime > windowMs * 2) {
      rateLimitStore.delete(k);
    }
  }
};

/**
 * Get security headers for API responses
 */
const getSecurityHeaders = (additionalHeaders = {}) => {
  return {
    // CORS - Restrict to specific domains in production
    'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
      ? 'https://your-domain.com' 
      : 'http://localhost:3000',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Max-Age': '86400',
    
    // Security headers
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none';",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    
    ...additionalHeaders
  };
};

/**
 * Validate request size
 */
const validateRequestSize = (body, maxSize = 1024 * 100) => { // 100KB default
  if (!body) return;
  
  const size = Buffer.byteLength(body, 'utf8');
  if (size > maxSize) {
    throw new Error(`Request body too large. Maximum size: ${maxSize} bytes`);
  }
};

/**
 * Safe JSON parsing with size limits
 */
const safeJsonParse = (jsonString, maxSize = 1024 * 100) => {
  if (!jsonString) {
    return {};
  }
  
  validateRequestSize(jsonString, maxSize);
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Prevent prototype pollution
    if (parsed && typeof parsed === 'object') {
      if (parsed.constructor !== Object && parsed.constructor !== Array) {
        throw new Error('Invalid JSON structure');
      }
      
      // Check for dangerous keys
      const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      const checkForDangerousKeys = (obj) => {
        if (typeof obj !== 'object' || obj === null) return;
        
        for (const key in obj) {
          if (dangerousKeys.includes(key)) {
            throw new Error('Invalid property key detected');
          }
          if (typeof obj[key] === 'object') {
            checkForDangerousKeys(obj[key]);
          }
        }
      };
      
      checkForDangerousKeys(parsed);
    }
    
    return parsed;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};

/**
 * Sanitize error messages for client response
 */
const sanitizeError = (error, includeStack = false) => {
  const safeError = {
    success: false,
    error: 'Internal Server Error',
    message: 'An error occurred while processing your request'
  };
  
  // In development, provide more details
  if (process.env.NODE_ENV !== 'production') {
    safeError.message = error.message || safeError.message;
    if (includeStack) {
      safeError.stack = error.stack;
    }
  }
  
  // Log actual error for monitoring
  console.error('API Error:', error);
  
  return safeError;
};

/**
 * Validate property ID format
 */
const validatePropertyId = (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('Property ID is required and must be a string');
  }
  
  // Allow UUID format or legacy numeric IDs for backward compatibility
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const numericRegex = /^\d+$/;
  
  if (!uuidRegex.test(id) && !numericRegex.test(id)) {
    throw new Error('Invalid property ID format');
  }
  
  return id;
};

module.exports = {
  generateSecureId,
  sanitizeString,
  validateNumber,
  checkRateLimit,
  getSecurityHeaders,
  validateRequestSize,
  safeJsonParse,
  sanitizeError,
  validatePropertyId
};
