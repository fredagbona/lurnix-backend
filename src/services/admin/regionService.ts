import { Request } from 'express';

/**
 * Service for handling region-based functionality
 */
export class RegionService {
  /**
   * Default region code to use when no region can be determined
   */
  private static DEFAULT_REGION = 'US';

  /**
   * Region mapping for currency codes to region codes
   */
  private static CURRENCY_TO_REGION: Record<string, string> = {
    'USD': 'US',
    'GBP': 'GB',
    'EUR': 'EU',
    'CAD': 'CA',
    'AUD': 'AU',
    'INR': 'IN',
    'NGN': 'NG',
    'ZAR': 'ZA',
    'KES': 'KE',
    'GHS': 'GH',
  };

  /**
   * Region mapping for country codes to region codes
   */
  private static COUNTRY_TO_REGION: Record<string, string> = {
    // North America
    'US': 'US',
    'CA': 'CA',
    
    // Europe
    'GB': 'GB',
    'IE': 'GB',
    'DE': 'EU',
    'FR': 'EU',
    'ES': 'EU',
    'IT': 'EU',
    'NL': 'EU',
    'BE': 'EU',
    'PT': 'EU',
    'AT': 'EU',
    'CH': 'EU',
    'SE': 'EU',
    'DK': 'EU',
    'NO': 'EU',
    'FI': 'EU',
    'PL': 'EU',
    
    // Oceania
    'AU': 'AU',
    'NZ': 'AU',
    
    // Asia
    'IN': 'IN',
    'SG': 'US', // Use USD for Singapore
    'JP': 'US', // Use USD for Japan
    'KR': 'US', // Use USD for South Korea
    
    // Africa
    'NG': 'NG',
    'ZA': 'ZA',
    'KE': 'KE',
    'GH': 'GH',
    'EG': 'US', // Use USD for Egypt
    'MA': 'EU', // Use EUR for Morocco
  };

  /**
   * Determine the region code from a request
   * Uses the following methods in order:
   * 1. Query parameter 'region'
   * 2. Accept-Language header
   * 3. X-Forwarded-For or IP address
   * 4. Default region (US)
   * 
   * @param req Express request object
   * @returns Region code (e.g., 'US', 'GB', 'EU')
   */
  public static getRegionFromRequest(req: Request): string {
    // 1. Check query parameter
    const queryRegion = req.query.region as string;
    if (queryRegion && this.isValidRegion(queryRegion.toUpperCase())) {
      return queryRegion.toUpperCase();
    }

    // 2. Check Accept-Language header
    const acceptLanguage = req.headers['accept-language'];
    if (acceptLanguage) {
      const languageRegion = this.getRegionFromLanguage(acceptLanguage);
      if (languageRegion) {
        return languageRegion;
      }
    }

    // 3. Check IP address
    const ipRegion = this.getRegionFromIP(req);
    if (ipRegion) {
      return ipRegion;
    }

    // 4. Default to US
    return this.DEFAULT_REGION;
  }

  /**
   * Get region from Accept-Language header
   * @param languageHeader Accept-Language header value
   * @returns Region code or null if not found
   */
  private static getRegionFromLanguage(languageHeader: string): string | null {
    // Parse the Accept-Language header
    // Format is typically: en-US,en;q=0.9,fr;q=0.8
    const languages = languageHeader.split(',');
    
    for (const lang of languages) {
      const parts = lang.trim().split(';')[0].split('-');
      if (parts.length > 1) {
        const countryCode = parts[1].toUpperCase();
        const region = this.getRegionFromCountry(countryCode);
        if (region) {
          return region;
        }
      }
    }
    
    return null;
  }

  /**
   * Get region from IP address
   * @param req Express request object
   * @returns Region code or null if not found
   */
  private static getRegionFromIP(req: Request): string | null {
    // In a real implementation, this would use a GeoIP service
    // For now, we'll just extract the country code from X-Forwarded-For
    // or the IP address and map it to a region
    
    // Get IP address
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip || '';
    
    // For demonstration purposes, we'll just check if the IP contains
    // certain patterns that might indicate a region
    // In a real implementation, you would use a GeoIP service
    
    // This is just a placeholder implementation
    if (!ip || ip.includes('192.168.') || ip.includes('127.0.0.1') || ip.includes('::1')) {
      // Local IP, can't determine region
      return null;
    }
    
    // In a real implementation, you would call a GeoIP service here
    // For now, we'll just return null
    return null;
  }

  /**
   * Get region from country code
   * @param countryCode ISO country code (e.g., 'US', 'GB')
   * @returns Region code or null if not found
   */
  private static getRegionFromCountry(countryCode: string): string | null {
    return this.COUNTRY_TO_REGION[countryCode] || null;
  }

  /**
   * Check if a region code is valid
   * @param regionCode Region code to check
   * @returns True if valid, false otherwise
   */
  private static isValidRegion(regionCode: string): boolean {
    const validRegions = Object.values(this.COUNTRY_TO_REGION);
    return validRegions.includes(regionCode);
  }

  /**
   * Get region from currency code
   * @param currencyCode Currency code (e.g., 'USD', 'GBP')
   * @returns Region code or default region if not found
   */
  public static getRegionFromCurrency(currencyCode: string): string {
    return this.CURRENCY_TO_REGION[currencyCode] || this.DEFAULT_REGION;
  }

  /**
   * Get all supported regions
   * @returns Array of supported region codes
   */
  public static getSupportedRegions(): string[] {
    return [...new Set(Object.values(this.COUNTRY_TO_REGION))];
  }
}
