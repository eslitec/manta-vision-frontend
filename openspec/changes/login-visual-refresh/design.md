## Context

`LoginView.vue` 目前是「淺色背景 + 置中白色卡片」版型：品牌區塊用一個純色圓形色塊搭配「MantaGO / Manta Vision」文字堆疊，沒有使用官方 logo。這次透過 Pencil 出了三個結構明顯不同的提案（加強版置中卡片／左右分割／全螢幕背景懸浮卡片）供比較，最終選定「全螢幕背景懸浮卡片」方向。設計稿存放在使用者本機的 Pencil 檔案（`login-redesign-restored.pen`，top-level frame id `iMfgU`），不是本專案既有的 Figma「MantaGO draft」檔案內的既有頁面——這是本次的例外，因為登入頁重新設計的視覺方向不在既有 Figma 頁面清單中，改用 Pencil 產生新提案，但色票／字體仍沿用 Figma 既有 token。

登入頁的功能行為（帳密驗證、路由守衛、登入狀態持久化、登出）已經在 `login-gate` capability 中實作完成（17/17 任務），本次變更不動這些行為，只調整 `.loginView` 容器的視覺呈現。

## Goals / Non-Goals

**Goals:**

- 將 `.loginView` 容器改為全螢幕背景圖 + 置中懸浮白色卡片版型。
- 品牌區塊改用官方 MantaGO logo 圖片（圖示＋字標），取代原本的圓形色塊頭像＋文字堆疊。
- 窄螢幕（< `$bp-md`）下卡片維持置中可用，不因背景版型跑版或溢出。
- 沿用 Figma 既有色票／字體 token，不新增顏色變數。

**Non-Goals:**

- 不改動登入頁的欄位、驗證邏輯、路由守衛、登入狀態持久化、登出等既有行為（`login-gate` 既有 Requirement 不變）。
- 不改動 `AppButton` 等共用元件的外觀（範圍鎖定在 `.loginView` 自己的容器層）。
- 不處理錯誤／loading 狀態的視覺重新設計，沿用既有的紅框錯誤樣式與 `AppButton` 內建 loading 樣式。
- 不追求背景美術資產的最終定稿：本次使用 AI 生成的示意圖，之後由設計端替換正式圖檔時視為後續變更，不在本次 change 範圍內。
- 不建立新的 RWD 斷點，沿用專案既有的 `$bp-lg`（1024px）／`$bp-md`（768px）／`$bp-sm`（560px）。

## Decisions

### 全螢幕背景 + 懸浮卡片版型取代置中卡片

`.loginView` 的背景由目前的 `$bgPrimary` 純色改為滿版背景圖（`background-size: cover`），卡片改為 `position` 置中於視窗正中央，卡片本身維持白色不透明背景（`$white`）與現有的圓角、陰影邏輯，只是外層容器不再是純色底。

備選方案：卡片改用半透明毛玻璃（`backdrop-filter: blur`）效果，讓底圖若隱若現。實測後半透明卡片與品牌 logo 的白底色塊產生色塊對比（logo 圖片本身是白底），視覺上不一致；改成卡片與 logo 背景統一為不透明白色後對比問題消失，因此採用不透明白卡片。

### 品牌區塊改用官方 MantaGO logo 圖片

原本的「圓形色塊頭像 + `strong`/`small` 文字堆疊」（`.loginView__avatar`、`.loginView__brandText`）整組移除，改成單一個 `img`／背景圖的 logo 圖片元素，寬度依設計稿比例（約 130:36）縮放，維持在卡片左上角、標題上方的既有位置關係。

備選方案：用 SVG inline 元件（比照 `src/components/icons/` 慣例）內嵌 logo 向量圖。因為官方 logo 是取自 MantaGO 官網的既有 SVG 資產（`https://mantago.cc/image/MantaGO_logo.svg`），直接複用該向量檔存成 `src/assets/images/mantago-logo.svg` 並以 `img` 標籤引用即可，不需要重新繪製成 inline 元件。

### 窄螢幕斷點行為：卡片維持置中

沿用專案既有斷點 token：`$bp-sm`（560px）以下卡片維持單欄置中、寬度改為 `fill_container`／`calc(100% - 間距)` 邏輯（實作時用既有的 `width: 100%; max-width: ...` 寫法），不做左右分割或跑版；背景圖在窄螢幕下維持 `cover` 裁切，不額外裁切成不同構圖。

### 背景美術資產以 AI 生成圖片作為過渡方案

背景圖與 Pencil 提案中的插圖，目前都是透過 Pencil 的 AI 生成功能產出的示意圖（深海／鬼蝠魟意象），非最終定稿美術。落地時把生成圖匯出存成 `src/assets/images/login-bg.png`，作為可上線的過渡資產；後續若設計端提供正式圖檔，屬於另一個獨立 change，不在本次範圍內處理。

## Implementation Contract

- **Behavior**：使用者訪問 `/login` 時，看到滿版背景圖鋪底、畫面正中央懸浮一張不透明白色卡片；卡片內容（品牌 logo、標題「登入」、帳號欄位、密碼欄位、送出按鈕）與現有功能完全一致，只有外觀改變。錯誤訊息、loading 狀態的觸發時機與文案不變。
- **Interface / data shape**：`LoginView.vue` 的 `<script setup>` 區塊（`username`、`password`、`showError`、`submit()` 等）不變；`i18n` key（`brand.name`、`auth.title`、`auth.usernameLabel` 等）維持原有結構，不新增、不刪除、不改值。新增兩個靜態資產檔案：`src/assets/images/mantago-logo.svg`、`src/assets/images/login-bg.png`。
- **Failure modes**：沿用既有的 `isInvalidCredentials` 錯誤判斷與 `role="alert"` 錯誤訊息顯示邏輯，本次不新增任何錯誤路徑。
- **Acceptance criteria**：
  - `npm run build`（`vue-tsc --noEmit` + vite build）通過。
  - `npm run lint` 通過。
  - 手動在瀏覽器開啟 `/login`，桌面寬度（≥ `$bp-lg`）與窄螢幕寬度（< `$bp-sm`）下卡片都置中顯示、不溢出、不跑版，品牌 logo 清楚可見且與卡片背景無色塊對比。
  - 輸入正確／錯誤帳密的既有登入流程（`login-gate` 既有 Scenario）行為不變。
- **Scope boundaries**：僅修改 `src/views/LoginView.vue` 的 `.loginView` 容器層 template 結構與 `<style>` 區塊，以及新增前述兩個靜態圖片資產。不修改 `src/stores/session.ts`、`src/router/**`、`src/api/mock.ts`、`src/lang/**`、`AppButton.vue` 或其他共用元件。

## Risks / Trade-offs

- [背景圖檔案較大可能影響登入頁載入速度] → 匯出時控制圖片解析度與壓縮（目標檔案大小 < 500KB），必要時之後改用 `<picture>` 搭配 WebP。
- [AI 生成的背景圖非正式美術資產，日後需要替換] → 已在 Non-Goals 中明確排除本次處理正式美術定稿，替換另立 change。
- [logo 圖片抓自外部官網，若官網日後改版可能導致本地檔案與官方版本不同步] → logo 檔案落地後即為專案自有靜態資產，不做執行期抓取，同步與否由後續品牌資產更新流程處理，不影響本次功能穩定性。
