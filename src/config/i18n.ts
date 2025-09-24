import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import { join, resolve } from 'path';

// Get absolute path to locales directory
const localesPath = resolve(__dirname, '../locales');

export async function initI18n() {
  try {
    await i18next
      .use(Backend)
      .init({
        backend: {
          loadPath: join(localesPath, '{{lng}}/{{ns}}.json'),
          addPath: join(localesPath, '{{lng}}/{{ns}}.missing.json'),
        },
        debug: false,
        fallbackLng: 'en',
        supportedLngs: ['en', 'fr'],
        ns: ['auth', 'common', 'errors', 'admin', 'quiz', 'routes', 'features'],
        defaultNS: 'auth',
        preload: ['en', 'fr'],
        load: 'languageOnly',
        saveMissing: true, // Save missing translations
        detection: {
          order: ['querystring', 'cookie', 'header'],
          lookupQuerystring: 'lng',
          lookupCookie: 'i18next',
          lookupHeader: 'accept-language',
        },
        interpolation: {
          escapeValue: false,
        },
        initImmediate: false,
      });

    return i18next;
  } catch (error) {
    console.error('Failed to initialize i18next:', error);
    throw error;
  }
}
