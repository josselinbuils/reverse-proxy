module.exports = {
  extends: '@josselinbuils/eslint-config-typescript',
  rules: {
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-var-requires': 'off',
    'import/no-dynamic-require': 'off',
    'import/order': [
      'error',
      {
        alphabetize: { order: 'asc', caseInsensitive: false },
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'object',
        ],
        'newlines-between': 'never',
        pathGroups: [
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        warnOnUnassignedImports: true,
      },
    ],
  },
};
