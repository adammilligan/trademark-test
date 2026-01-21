import js from '@eslint/js'
import perfectionist from 'eslint-plugin-perfectionist'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const sortRules = {
  'import/order': 0,
  'perfectionist/sort-imports': [
    'error',
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreCase: true,
      newlinesBetween: 'always',
      customGroups: {
        value: {
          react: ['^react$', '^react-dom$'],
          // Важно: НЕ матчим наши FSD-алиасы (@app/@shared/...) как libraries
          libraries: ['^(?!@(?:app|pages|widgets|features|entities|shared)(?:/|$))@?\\w'],
          shared: ['^@shared(?:/.*)?$'],
          entities: ['^@entities(?:/.*)?$'],
          features: ['^@features(?:/.*)?$'],
          widgets: ['^@widgets(?:/.*)?$'],
          pages: ['^@pages(?:/.*)?$'],
          app: ['^@app(?:/.*)?$'],
          local: ['^\\.'],
        },
      },
      groups: [
        'react',
        'libraries',
        'shared',
        'entities',
        'features',
        'widgets',
        'pages',
        'app',
        'local',
      ],
    },
  ],
  'sort-imports': [
    'error',
    {
      ignoreCase: true,
      ignoreDeclarationSort: true,
      allowSeparatedGroups: true,
      memberSyntaxSortOrder: ['multiple', 'single', 'all', 'none'],
    },
  ],
  'perfectionist/sort-named-imports': [
    'error',
    {
      type: 'alphabetical',
      order: 'asc',
      ignoreCase: true,
    },
  ],
}

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      perfectionist,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      ...sortRules,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      perfectionist,
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      ...sortRules,
    },
  },
)
