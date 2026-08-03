import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// Flat config（ESLint 9）。Vue 3 + TypeScript + Prettier。
// 格式交給 Prettier，ESLint 只管程式碼品質規則。
export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,vue}'],
  },
  {
    name: 'app/files-to-ignore',
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    // .vue 用 <template lang="pug">，vue-eslint-parser 無法解析 pug 模板，
    // 因此看不到只在模板中使用的變數／函式，no-unused-vars 會誤報。
    // .vue 關掉此規則；.ts 檔（store／api／composable）維持完整檢查。
    name: 'app/vue-pug',
    files: ['**/*.vue'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    name: 'app/dts-overrides',
    files: ['**/*.d.ts'],
    rules: {
      // .vue 型別 shim 需要 any 與空物件型別
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  skipFormatting,
)
