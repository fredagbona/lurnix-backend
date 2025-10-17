import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';

/**
 * Initialize i18next configuration
 * @returns configured i18next instance
 */
export const initI18n = async () => {
  await i18next
    .use(Backend)
    .use(middleware.LanguageDetector)
    .init({
      // Supported languages
      supportedLngs: ['en', 'fr'],
      fallbackLng: 'en',
      
      // Default namespace
      defaultNS: 'common',
      
      // Namespaces for different areas of the application
      ns: ['common', 'auth', 'quiz', 'errors', 'admin', 'pricing', 'coupons', 'billing', 'emails', 'objectives'],
      
      // Backend configuration for loading translations
      backend: {
        loadPath: path.join(__dirname, '../../locales/{{lng}}/{{ns}}.json'),
      },
      
      // Detection options
      detection: {
        // Order of language detection
        order: ['header', 'cookie', 'querystring'],
        
        // Look for language in these headers
        lookupHeader: 'accept-language',
        lookupQuerystring: 'lng',
        lookupCookie: 'i18next',
        
        // Cache user language
        caches: ['cookie'],
        
        // Cookie options
        cookieSecure: process.env.NODE_ENV === 'production',
        cookieDomain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
      },
      
      // Interpolation configuration
      interpolation: {
        escapeValue: false, // React already safes from XSS
      },
      
      // Enable debugging to see what's happening
      debug: true
    });

  // Verify pricing namespace is loaded
  console.log('[i18n] Initialization complete');
  console.log('[i18n] Available languages:', i18next.languages);
  console.log('[i18n] Loaded namespaces:', i18next.options.ns);
  
  // Test pricing namespace
  const testKey = 'pricing.plans.free.name';
  const enTest = i18next.t(testKey, { lng: 'en', ns: 'pricing' });
  const frTest = i18next.t(testKey, { lng: 'fr', ns: 'pricing' });
  console.log('[i18n] Test translations:', { en: enTest, fr: frTest });

  return i18next;
};

// Export configured instance
export default i18next;

// Type definition for translation function
export type TFunction = typeof i18next.t;

// Helper function to get translation for a specific language
export const getTranslation = (key: string, lng: string = 'en', options = {}) => {
  return i18next.getFixedT(lng)(key, options);
};
