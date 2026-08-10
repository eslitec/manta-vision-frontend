## Why

The team architecture requires `vue-i18n`, but the archived `remove-i18n` change removed the dependency and embedded Traditional Chinese directly in UI components. This creates a mismatch between the documented architecture, review expectations, and the implementation.

## What Changes

- Restore `vue-i18n` as an application plugin with Traditional Chinese as the default and fallback locale.
- Centralize user-facing copy from layouts, shared components, and MV00–MV09 views in locale files.
- Preserve stable language-neutral state identifiers for tabs, modes, and filters so locale changes do not affect behavior.
- Keep dynamic values, asset names, and backend identifiers separate from translated UI labels.
- Supersede, rather than rewrite, the archived `2026-08-04-remove-i18n` decision.

## Capabilities

### New Capabilities

- `ui-localization`: Project-wide localization infrastructure and requirements for translated UI copy.

### Modified Capabilities

None.

## Impact

- `package.json` and `package-lock.json`: add the supported `vue-i18n` dependency.
- `src/main.ts` and `src/lang/`: register and define locale resources.
- `src/layouts/`, `src/components/`, `src/views/`, and user-facing task notifications: replace embedded interface copy with translation keys.
- Existing backend/mock content and persistent business values remain unchanged.
