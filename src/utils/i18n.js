const i18n = require('i18next');
const Backend = require('i18next-fs-backend');
const middleware = require('i18next-http-middleware');
const path = require('path');

i18n
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'he',
    preload: ['he', 'en'],
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}/translation.json')

    }
  });

module.exports = i18n;

