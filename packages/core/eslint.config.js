import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // core est pur : aucun import externe autorisé (specs techniques 1.7, 6.1)
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['react*', 'expo*', '@powersync/*', '@supabase/*'], message: 'core n\'a aucune dépendance.' }] },
      ],
    },
  },
);
