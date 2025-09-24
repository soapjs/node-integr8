/**
   * Builds a proper full path by ensuring correct URL formatting
   * Handles cases like:
   * - "ping" -> "/ping"
   * - "/health" -> "/health" 
   * - "health/" -> "/health"
   * - "/health/status" -> "/health/status"
   */
export function buildFullPath(urlPrefix: string, endpointPath: string): string {
    // Normalize endpoint path - ensure it starts with / and doesn't end with /
    let normalizedPath = endpointPath.trim();
    
    // Add leading slash if missing
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
    
    // Remove trailing slash if present (except for root path)
    if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
      normalizedPath = normalizedPath.slice(0, -1);
    }
    
    // Combine with prefix
    let fullPath = urlPrefix + normalizedPath;

    if (!fullPath.startsWith('/')) {
        fullPath = '/' + fullPath;
    }

    // Ensure we don't have double slashes
    return fullPath.replace(/\/+/g, '/');
  }