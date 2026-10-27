const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

const powersync = {
  group: ['@powersync/*'],
  message: 'Les écrans passent par @commedab/data (specs techniques 2.9).',
};
const supabase = {
  group: ['@supabase/*'],
  message: "Supabase n'est appelé que depuis src/auth (specs techniques 5.1).",
};

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', '.expo/*', 'public/@powersync/*'] },
  {
    rules: { 'no-restricted-imports': ['error', { patterns: [powersync, supabase] }] },
  },
  {
    files: ['src/auth/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [powersync] }] },
  },
]);
