// frontend/eslint.config.js

const globals = require('globals');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');

// --- Import all necessary plugins manually ---
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactNativePlugin = require('@react-native-community/eslint-plugin');
//const tPlugin = require('eslint-plugin-t');
//const stylesPlugin = require('eslint-plugin-styles');

module.exports = tseslint.config(
  // Base ESLint recommended rules
  js.configs.recommended,

  // Base TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Configuration for files to ignore
  {
    ignores: ['node_modules', 'babel.config.js', 'metro.config.js', 'dist', 'coverage', 'src/generated/**/*.ts'],
  },

  // Main configuration block for your source code
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      // Register all the plugins we need
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@react-native': reactNativePlugin,
      // Have to move away from these plugins because of eslint v9 compatibility issues
      //t: tPlugin,
      //styles: stylesPlugin,
    },
    rules: {
      // --- Recommended rules from the plugins we're replacing "expo" with ---
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // deprecated custom rules
      //'t/string-literal': 'warn',
      //'styles/style-maker-no-unused': 'warn',

      // --- Common overrides you might want ---
      'react/react-in-jsx-scope': 'off', // Not needed with modern React/Expo
      'react/prop-types': 'off', // We use TypeScript for prop types
    },
    settings: {
      react: {
        version: 'detect', // Automatically detect the React version
      },
    },
  },
);

// ignores: ['node_modules', 'babel.config.js', 'metro.config.js', 'src/generated/**/*.ts'],