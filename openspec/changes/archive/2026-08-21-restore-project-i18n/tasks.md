## 1. Locale Infrastructure

- [x] 1.1 Deliver **Application-wide locale infrastructure** by implementing **Register one Composition API i18n instance** with Traditional Chinese default/fallback; verify `vue-i18n` is installed, `app.use(i18n)` runs before mount, and `npm run build` passes.
- [x] 1.2 Deliver matching Traditional Chinese and English semantic dictionaries in `src/lang/`; verify both resources cover every key referenced by the migrated UI through content review and production build.

## 2. Interface Migration

- [x] 2.1 Deliver **Interface copy is locale-backed** for shared layouts, components, dialogs, ARIA labels, and background task notifications; verify embedded UI-copy scan, ESLint, and production build.
- [x] 2.2 Deliver **Interface copy is locale-backed** for MV00–MV05 views while preserving their Figma-aligned behavior; verify page source review, 48 existing tests, and production build.
- [x] 2.3 Deliver **Interface copy is locale-backed** for MV06–MV09 views and keep those changes outside the MV00–MV05 PR staging boundary; verify page source review and `git diff --cached` before any future PR update.
- [x] 2.4 Deliver **Translated defaults support caller overrides** in reusable dialogs and toggles; verify omitted props resolve locale keys and explicit props remain authoritative through type-check/build.

## 3. Stable State and Data Boundaries

- [x] 3.1 Deliver **Translated labels do not control behavior** using **Use semantic locale keys and stable state identifiers** for tabs, modes, filters, and models; verify locale labels are absent from conditional state comparisons.
- [x] 3.2 Deliver **Dynamic content remains distinct from interface copy** using **Preserve content and persistent values outside the locale layer**; verify user/backend names remain unchanged while system source/status labels resolve through locale keys.

## 4. Decision and Verification

- [x] 4.1 Record **Supersede the archived decision with a new change** without modifying the archived `2026-08-04-remove-i18n` artifacts; verify this change documents the new source of truth and passes `spectra validate restore-project-i18n --strict`.
- [x] 4.2 Verify the complete implementation contract with hard-coded copy scans, Prettier, ESLint, all Vitest tests, `npm run build`, and strict Spectra validation; record any non-blocking pre-existing warnings.
