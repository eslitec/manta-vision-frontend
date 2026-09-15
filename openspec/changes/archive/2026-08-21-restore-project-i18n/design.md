## Context

The repository architecture identifies `vue-i18n` and `src/lang/` as the localization layer. An earlier archived change removed that layer based on a single-locale assumption, while current team review requires `$t()` usage. The migration crosses layouts, shared components, route views, and background notifications.

## Goals / Non-Goals

**Goals:**

- Restore one application-wide i18n instance.
- Centralize all interface copy for Traditional Chinese and English.
- Keep behavioral state independent of translated labels.
- Record a new decision that supersedes the archived removal without rewriting history.

**Non-Goals:**

- Translate backend-provided asset names, user-entered folder names, or persisted brand values.
- Add a visible locale selector to the current Figma screens.
- Change MV00–MV09 layouts or product behavior.

## Decisions

### Register one Composition API i18n instance

The app uses `createI18n` with `legacy: false`, global template injection, Traditional Chinese as the default, and Traditional Chinese fallback. A single registered instance supports both component `useI18n()` calls and non-component notification code through `i18n.global.t`.

### Use semantic locale keys and stable state identifiers

Interface copy uses capability-oriented keys such as `library.moveToFolder`. Tabs, modes, filters, and model choices use stable identifiers such as `library`, `retouch`, and `builtIn`; translated labels never drive control flow.

### Preserve content and persistent values outside the locale layer

Mock/backend asset names, user-created names, and values persisted to existing APIs remain data. The UI translates the labels surrounding that data and maps system enums such as asset tags to locale keys.

### Supersede the archived decision with a new change

The archived `remove-i18n` artifacts remain intact as history. This change records the newer team architecture decision and becomes the active source of truth.

## Implementation Contract

- The application SHALL register `vue-i18n` before mounting.
- Traditional Chinese SHALL be the default and fallback locale.
- User-facing labels, instructions, placeholders, ARIA labels, status messages, and errors SHALL resolve through locale resources.
- Optional dialog props SHALL override translated defaults; omitted props SHALL fall back to locale keys.
- Switching locale programmatically SHALL change interface labels without changing active tabs, selected filters, task state, or persisted business values.
- Backend/user content SHALL render unchanged.
- Acceptance requires strict Spectra validation, no remaining embedded UI copy in Vue templates or user-facing task notifications, passing lint/tests, and a successful production build.

## Risks / Trade-offs

- [Large locale dictionaries can drift] → Keep identical key structures in both locale files and validate during review.
- [Translated labels used as state can break interactions] → Use language-neutral identifiers for all control flow.
- [Current PR is limited to MV00–MV05] → Keep MV06+ work local and stage only approved hunks when the PR is updated.
