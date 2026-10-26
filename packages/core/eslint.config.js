import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['src/**'],
  rules: {
    // core est pur : seuls les imports relatifs sont autorisés (specs techniques 1.7, 6.1)
    'no-restricted-imports': [
      'error',
      { patterns: [{ regex: '^(?!\\.{1,2}/)', message: "core n'a aucune dépendance." }] },
    ],
  },
});
