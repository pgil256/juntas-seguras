module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  ignorePatterns: ['node_modules/', '.next/', 'out/', '__tests__/', 'e2e/', 'performance/'],
  rules: {
    'react/no-unescaped-entities': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'import/no-anonymous-default-export': 'warn'
  }
};
