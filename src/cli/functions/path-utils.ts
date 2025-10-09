/**
 * Utilities for working with paths, URLs, and endpoint names
 */

/**
 * Normalizes a URL or path to a clean path string
 */
export function normalizePath(path: string): string {
  // Remove protocol and domain if present
  let normalizedPath = path;
  
  // Handle full URLs like http://localhost:3000/api/v1/users
  if (path.includes('://')) {
    try {
      const url = new URL(path);
      normalizedPath = url.pathname;
    } catch (error) {
      // If URL parsing fails, try to extract path manually
      const match = path.match(/\/[^?]*/);
      if (match) {
        normalizedPath = match[0];
      }
    }
  }
  
  // Handle malformed URLs like /http:localhost:3000/api/v1/users
  if (normalizedPath.startsWith('/http:') || normalizedPath.startsWith('/https:')) {
    const match = normalizedPath.match(/\/https?:\/\/[^\/]+(\/.*)/);
    if (match) {
      normalizedPath = match[1];
    }
  }
  
  // Ensure path starts with /
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  
  return normalizedPath;
}

/**
 * Converts a URL to a path, removing base URL if detected
 */
export function normalizeUrlToPath(url: string | undefined, baseUrl?: string): string {
  // Handle undefined or null
  if (!url) {
    console.warn('⚠️  URL is undefined, using default path /');
    return '/';
  }
  
  try {
    // If URL contains the detected baseUrl, extract the path
    if (baseUrl && url.startsWith(baseUrl)) {
      const path = url.substring(baseUrl.length);
      return path.startsWith('/') ? path : '/' + path;
    }

    // If URL is a full URL, extract pathname
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch (error) {
    // If URL parsing fails, assume it's already a path
    return url.startsWith('/') ? url : '/' + url;
  }
}

/**
 * Extracts resource name from path (e.g., /users/:id -> users, /api/users -> users)
 */
export function extractResourceName(path: string): string {
  const parts = path.split('/').filter(part => part.length > 0 && !part.startsWith(':'));
  const meaningfulParts = parts.filter(part => part !== 'api' && part !== 'v1' && part !== 'v2');
  return meaningfulParts[0] || 'endpoint';
}

/**
 * Extracts endpoint name from path for file naming
 */
export function extractEndpointName(path: string): string {
  let normalizedPath = path.trim();
  
  // Remove leading slash
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }
  
  // Remove trailing slash
  if (normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }
  
  // Split by slash and take the last meaningful part
  const parts = normalizedPath.split('/').filter(part => part.length > 0);
  
  if (parts.length === 0) {
    return 'root';
  }
  
  // Get the last part and clean it up
  let endpointName = parts[parts.length - 1];
  
  // Replace path parameters with descriptive names
  endpointName = endpointName.replace(/:([^/]+)/g, (match, paramName) => {
    return `-${paramName}`;
  });
  
  // Remove any remaining special characters
  endpointName = endpointName.replace(/[^a-zA-Z0-9-]/g, '-');
  
  // Remove multiple consecutive dashes
  endpointName = endpointName.replace(/-+/g, '-');
  
  // Remove leading/trailing dashes
  endpointName = endpointName.replace(/^-+|-+$/g, '');
  
  return endpointName || 'endpoint';
}

/**
 * Extracts controller name from path
 */
export function extractControllerFromPath(path: string): string {
  const parts = path.split('/').filter(part => part.length > 0);
  if (parts.length === 0) return 'RootController';
  
  // Get the first meaningful part
  const firstPart = parts[0];
  return capitalize(firstPart) + 'Controller';
}

/**
 * Extracts group name from path
 */
export function extractGroupFromPath(path: string): string {
  const parts = path.split('/').filter(part => part.length > 0);
  if (parts.length === 0) return 'api';
  
  return parts[0];
}

/**
 * Extracts path parameters from path
 */
export function extractParamsFromPath(path: string): string[] {
  const matches = path.match(/:([^/]+)/g);
  return matches ? matches.map(match => match.substring(1)) : [];
}

/**
 * Normalizes path for comparison (converts actual values to :id placeholders)
 */
export function normalizePathForComparison(path: string): string {
  // Normalize path parameters for comparison
  // /users/123 -> /users/:id
  // /users/abc -> /users/:id
  // /posts/456/comments/789 -> /posts/:id/comments/:id
  
  return path.split('/').map(segment => {
    // If segment looks like a path param (number, uuid, etc.)
    if (looksLikeParam(segment)) {
      return ':id';
    }
    return segment;
  }).join('/');
}

/**
 * Checks if a path segment looks like a parameter value
 */
export function looksLikeParam(segment: string): boolean {
  // Check if segment looks like a parameter value
  if (!segment || segment.length === 0) return false;
  
  // Already a path param pattern
  if (segment.startsWith(':')) return false;
  
  // Looks like a number
  if (/^\d+$/.test(segment)) return true;
  
  // Looks like a UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) return true;
  
  // Looks like MongoDB ObjectId
  if (/^[0-9a-f]{24}$/i.test(segment)) return true;
  
  // Very short segments might be IDs (but exclude common words)
  const commonWords = ['api', 'v1', 'v2', 'new', 'all', 'me'];
  if (segment.length <= 3 && /^[a-z0-9]+$/i.test(segment) && !commonWords.includes(segment.toLowerCase())) {
    return true;
  }
  
  return false;
}

/**
 * Capitalizes first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

