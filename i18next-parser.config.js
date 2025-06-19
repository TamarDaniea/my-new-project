module.exports = {
  locales: ['en', 'he'],
  defaultNamespace: 'translation',
  output: 'locales/$LOCALE/translation.json',
  input: ['src/**/*.{js,jsx,ts,tsx}', '!**/node_modules/**'],
  keepRemoved: false,
  keySeparator: '.',
  namespaceSeparator: ':',
  useKeysAsDefaultValue: true,
};
