// @ts-check
import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintPluginVue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import globals from 'globals'

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'node_modules', '**/*.d.ts']),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  eslintPluginVue.configs['flat/recommended'],

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue']
      }
    }
  },

  // .vue files are parsed by vue-eslint-parser (set up by the recommended
  // config above); it delegates <script> parsing to @typescript-eslint's
  // parser so type-aware rules still work inside SFCs.
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser
      }
    }
  },

  {
    rules: {
      // `count`/numeric values (job counts, HTTP statuses, etc.) in
      // template literals are idiomatic and perfectly safe -- this
      // codebase has many of them (e.g. `${count} jobs`).
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true }
      ],
      // `noUncheckedIndexedAccess` (see tsconfig.app.json) already forces
      // `T | undefined` on every array/index access; `!` is the standard,
      // idiomatic way to assert "already validated" access back to `T`
      // afterwards (e.g. after an explicit `.length` check), which this
      // codebase does consistently and safely.
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  },

  {
    // Vue's generated types for a `.vue` component (via vue-tsc/Volar) can
    // resolve parts of a component's public instance -- and therefore
    // anything that types against it, like a template ref's
    // `InstanceType<typeof SomeComponent>` or the root `App` component
    // passed to `createApp()` -- down to `any` in ways outside this
    // codebase's control. Type-aware "unsafe" rules would otherwise flag
    // every use of such a ref/component reference, without catching any
    // actual bug in this code.
    files: ['**/*.vue', 'src/main.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off'
    }
  },

  {
    // Test doubles/mocks and @vue/test-utils' loosely-typed `VueWrapper`
    // (its `.vm`/`$emit` are effectively `any` by design, to accommodate
    // arbitrary component shapes) routinely trigger the same "unsafe"
    // rules for reasons that have nothing to do with this codebase's own
    // type safety. Empty mock callbacks (`vi.fn().mockImplementation(()
    // => {})`) are also a normal, common test pattern.
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-empty-function': 'off'
    }
  },

  // These one-off Node scripts are plain JS with JSDoc type comments, not
  // checked by `checkJs` (see tsconfig.node.json) -- so type-aware rules
  // would see mostly-`any` types throughout and produce noise unrelated
  // to any real issue.
  {
    files: ['scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked]
  },

  eslintConfigPrettier
])
