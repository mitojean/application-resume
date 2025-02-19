module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js', 'dist/', 'node_modules/'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_'
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        'checksVoidReturn': false
      }
    ],
    'no-console': ['warn', { 
      allow: ['warn', 'error', 'info'] 
    }],
    'no-return-await': 'error',
    'require-await': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'eqeqeq': ['error', 'always'],
    'no-multiple-empty-lines': ['error', { 
      'max': 1 
    }],
    'no-trailing-spaces': 'error',
    'quotes': ['error', 'single', { 
      'avoidEscape': true 
    }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'arrow-parens': ['error', 'always'],
    'max-len': ['error', { 
      'code': 100,
      'ignoreUrls': true,
      'ignoreStrings': true,
      'ignoreTemplateLiterals': true,
      'ignoreRegExpLiterals': true
    }],
    'indent': ['error', 2, { 
      'SwitchCase': 1 
    }],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-in-parens': ['error', 'never'],
    'space-before-function-paren': ['error', {
      'anonymous': 'never',
      'named': 'never',
      'asyncArrow': 'always'
    }],
    'space-before-blocks': ['error', 'always'],
    'keyword-spacing': ['error', { 
      'before': true, 
      'after': true 
    }],
    'no-multi-spaces': 'error',
    'key-spacing': ['error', { 
      'beforeColon': false, 
      'afterColon': true 
    }],
    'comma-spacing': ['error', { 
      'before': false, 
      'after': true 
    }],
    'brace-style': ['error', '1tbs', { 
      'allowSingleLine': true 
    }],
    'curly': ['error', 'all'],
    'no-else-return': 'error',
    'no-lonely-if': 'error',
    'no-unneeded-ternary': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'no-useless-concat': 'error',
    'no-duplicate-imports': 'error',
    'no-restricted-imports': ['error', {
      'patterns': [{
        'group': ['../*'],
        'message': 'Usage of relative parent imports is not allowed.'
      }]
    }],
    'import/order': 'off',
    '@typescript-eslint/consistent-type-imports': ['error', {
      'prefer': 'type-imports'
    }]
  },
  settings: {
    'import/resolver': {
      'typescript': {}
    }
  }
};
