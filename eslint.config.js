import globals from 'globals'
import js from '@eslint/js'
import eslintPluginVue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'

export default [
  // config envs
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    }
  },
  
  // config parsers
  js.configs.recommended,
  ...ts.configs.recommended,
  ...eslintPluginVue.configs['flat/recommended'],
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    }
  },

  {
    // https://eslint.org/docs/latest/use/configure/ignore
    ignores: [
      // only ignore node_modules in the same directory
      // as the configuration file
      'node_modules',
      // so you have to add `**/` pattern to include nested directories
      // for example, if you use pnpm workspace
      '**/node_modules',
      // also you can add a new rule to revert a ignore
      '!./packages/manual-add-lib/node_modules/local-lib.js'
    ]
  }
]
