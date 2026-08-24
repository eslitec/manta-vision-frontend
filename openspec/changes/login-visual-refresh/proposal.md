## Why

現有登入頁（`LoginView.vue`）視覺陽春：淺色置中卡片、品牌區塊只有一個純色圓形色塊搭配文字，沒有使用官方 MantaGO logo，品牌識別薄弱。透過 Pencil 出了三個結構明顯不同的版面提案（加強版置中卡片／左右分割／全螢幕背景懸浮卡片）供比較，最終選定「全螢幕深海背景 + 懸浮白色卡片」方向，需要落地到正式程式碼。

## What Changes

- `LoginView.vue` 的 `.loginView` 容器版型改為「全螢幕背景圖 + 置中懸浮白色卡片」，取代目前的淺色底置中卡片版型。
- 品牌區塊改用官方 MantaGO logo 圖片（圖示＋字標，取自 https://mantago.cc 官網），取代原本的圓形色塊頭像＋「MantaGO / Manta Vision」文字堆疊。
- 新增窄螢幕（< `$bp-md`）行為：卡片維持置中，沿用專案既有斷點 token（`$bp-lg`/`$bp-md`/`$bp-sm`），不新增斷點。
- 帳號／密碼欄位、送出按鈕（`AppButton`）、錯誤訊息、loading 狀態的行為與既有樣式規則不變，只有容器背景與品牌區塊的視覺改變。
- 背景圖為 AI 生成的示意美術資產（非最終定稿），供先行上線使用，之後由設計端替換為正式圖檔。
- 沿用 Figma「MantaGO draft」既有的色票／字體 token（`$blue-dark-500` 等），不新增顏色變數。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `login-gate`: 新增「登入頁視覺呈現」相關 Requirement（全螢幕背景＋懸浮卡片版型、品牌 logo 呈現方式），不改動既有的帳密驗證、路由守衛、登入狀態持久化、登出等 Requirement。

## Impact

- Affected specs: `login-gate`（新增視覺呈現 Requirement）
- Affected code:
  - Modified: `src/views/LoginView.vue`（僅 `.loginView` 容器層的樣式與 template 結構；不動 `<script setup>` 邏輯、不動欄位/按鈕/i18n key）
  - New: `src/assets/images/mantago-logo.svg`（官方品牌 logo）
  - New: `src/assets/images/login-bg.png`（AI 生成的登入頁全螢幕背景示意圖）
