import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a Vendure asset URL with optional size parameters
 * Vendure supports query parameters: w (width), h (height), mode (crop/resize)
 * 
 * @param baseUrl - The base asset URL (preview or source)
 * @param options - Size options for the image
 * @returns The URL with query parameters appended
 */
export function getVendureImageUrl(
  baseUrl: string,
  options?: {
    width?: number;
    height?: number;
    mode?: 'crop' | 'resize';
    quality?: number;
  }
): string {
  if (!baseUrl) return '';
  
  try {
    // Handle relative URLs by creating a URL object with a base
    // If it's already absolute, use it directly
    let url: URL;
    if (baseUrl.startsWith('http://') || baseUrl.startsWith('https://')) {
      url = new URL(baseUrl);
    } else {
      // For relative URLs, we'll append query params manually
      const separator = baseUrl.includes('?') ? '&' : '?';
      const params: string[] = [];
      
      if (options?.width) {
        params.push(`w=${options.width}`);
      }
      if (options?.height) {
        params.push(`h=${options.height}`);
      }
      if (options?.mode) {
        params.push(`mode=${options.mode}`);
      }
      if (options?.quality) {
        params.push(`q=${options.quality}`);
      }
      
      return params.length > 0 ? `${baseUrl}${separator}${params.join('&')}` : baseUrl;
    }
    
    // For absolute URLs, use URL API
    if (options?.width) {
      url.searchParams.set('w', options.width.toString());
    }
    if (options?.height) {
      url.searchParams.set('h', options.height.toString());
    }
    if (options?.mode) {
      url.searchParams.set('mode', options.mode);
    }
    if (options?.quality) {
      url.searchParams.set('q', options.quality.toString());
    }
    
    return url.toString();
  } catch {
    // If URL parsing fails, return original URL
    return baseUrl;
  }
}

/**
 * Get a small thumbnail URL for progressive loading
 * Uses a very small width to create a blur-up placeholder
 */
export function getThumbnailUrl(previewUrl: string, size: number = 50): string {
  return getVendureImageUrl(previewUrl, {
    width: size,
    height: size,
    mode: 'crop',
    quality: 50,
  });
}

/**
 * Get a medium-sized image URL for initial load
 */
export function getMediumImageUrl(previewUrl: string, width: number = 400): string {
  return getVendureImageUrl(previewUrl, {
    width,
    mode: 'resize',
    quality: 75,
  });
}

/**
 * Get the full resolution image URL (source or high-quality preview)
 */
export function getFullImageUrl(sourceUrl: string, previewUrl: string): string {
  // Prefer source URL if available, otherwise use preview
  return sourceUrl || previewUrl;
}
