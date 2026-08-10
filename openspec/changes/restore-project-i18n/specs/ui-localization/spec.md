## ADDED Requirements

### Requirement: Application-wide locale infrastructure

The application SHALL register a single `vue-i18n` instance using Composition API mode, with Traditional Chinese as the default and fallback locale.

#### Scenario: Application starts with the default locale

- **WHEN** the application mounts without an explicit locale selection
- **THEN** all localized interface copy resolves in Traditional Chinese

##### Example: Default confirmation title

- **GIVEN** no locale preference has been set
- **WHEN** the confirmation dialog renders
- **THEN** its title is `確認生成影片`

### Requirement: Interface copy is locale-backed

The application SHALL resolve user-facing labels, instructions, placeholders, accessibility labels, statuses, and errors through locale resources.

#### Scenario: A localized view renders

- **WHEN** a user opens any MV00–MV09 view or shared dialog
- **THEN** its interface copy resolves from the active locale instead of embedded template strings

### Requirement: Translated labels do not control behavior

Tabs, modes, filters, and other behavioral state MUST use language-neutral identifiers independent of translated labels.

#### Scenario: Locale changes while a tab is active

- **WHEN** the active locale changes while a tab, filter, or editor mode is selected
- **THEN** the displayed label changes and the selected behavior remains active

##### Example: Retouch tab remains active

- **GIVEN** editor mode is `retouch` and its Traditional Chinese label is `AI 修圖`
- **WHEN** locale changes to English
- **THEN** the label becomes `AI retouch` and mode remains `retouch`

### Requirement: Dynamic content remains distinct from interface copy

The application MUST preserve backend-provided names, user-entered values, and persistent business identifiers while localizing their surrounding labels.

#### Scenario: Asset name renders in another locale

- **WHEN** an asset with a user-defined name is displayed under a different interface locale
- **THEN** the asset name remains unchanged and its source/status labels are translated

##### Example: User asset name is preserved

- **GIVEN** an asset named `春季主視覺_01` with source tag `upload`
- **WHEN** locale changes to English
- **THEN** the name remains `春季主視覺_01` and the source label becomes `Uploaded`

### Requirement: Translated defaults support caller overrides

Reusable components with optional copy props SHALL use locale-backed defaults and SHALL preserve explicit caller-provided values.

#### Scenario: Confirm dialog omits optional copy

- **WHEN** a caller opens the confirmation dialog without title, message, or confirm-text props
- **THEN** the dialog resolves all three values from the active locale

##### Example: Traditional Chinese defaults

- **GIVEN** active locale `zh-Hant` and no optional copy props
- **WHEN** the dialog opens
- **THEN** title is `確認生成影片`, message uses `confirmGenerate.message`, and action is `確認生成`
