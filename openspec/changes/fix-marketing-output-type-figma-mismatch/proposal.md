## Problem

`src/views/MarketingPostView.vue` 的「要產出什麼」分段選擇器（`.outputTypes`／`.outputTypeCard`，實作自本次會期較早的 `add-marketing-post-output-type` change）跟 Figma 設計稿 node `1440:586`（`seg_output` 區塊，node `1440:588`）視覺上有多處落差：容器沒有共用底盤背景、每個選項各自有邊框看起來像獨立卡片而不是分段選擇器、選取狀態的視覺重量比設計稿重很多、文字字重字級不對、且遺漏了「選取中選項的顆數用橘色強調」這個資訊層級。

## Root Cause

`add-marketing-post-output-type` 實作時沿用了專案裡另一種「一般選項卡片」的既有樣式模式（各自獨立的邊框卡片，例如生成頁面裡選解析度/畫質的按鈕），沒有對照 Figma 這個節點本身其實是「分段選擇器」（segmented control）樣式——共用底盤＋透明未選取項＋白底陰影選取項，是不同的視覺語言。經 Figma MCP `get_design_context` 取得 node `1440:586`／`1440:590`（`segmented`）／`1440:591`／`1440:596`／`1440:601` 的精確節點資料，確認以下具體落差：

1. 容器：Figma `.segmented`（`1440:590`）背景 `#eff2fa`、`padding: 4px`、`gap: 4px`、`border-radius: 10px`，三個選項都在這個底盤裡面；現在的 `.outputTypes` 沒有底盤背景，是 `gap: 0.5rem` 的 flex row 加 `flex-wrap`
2. 選項卡片：Figma 每個選項 `flex: 1 0 0`（等寬填滿）、`padding: 7px 10px`、`border-radius: 8px`，未選取狀態透明無邊框；現在的 `.outputTypeCard` 不論選取與否都有 `1px solid #d2d5dd` 邊框、白色背景、`min-width: 6.5rem`
3. 選取狀態：Figma 選取項 `background: white` ＋ `box-shadow: 0px 1px 1.5px rgba(0,0,0,0.1)`，沒有邊框；現在的 `.isActive` 是 `background: $blue-light` ＋ `1.5px solid $blue-dark-500`，視覺效果明顯更重
4. 文字：Figma 未選取標籤 Regular／12px／`#606692`，選取標籤 Medium／12px／`#2e3567`（字重隨選取狀態變化，字級不變）；現在的 `.outputTypeCard__label` 不論選取與否都是 `font-weight: 700`、`font-size: 0.875rem`（14px），選取時只變顏色
5. 顆數文字顏色：Figma 對選取中選項的顆數文字用橘色 `#ea903a` 強調，未選取的兩個選項是淡灰色 `#b4b9c4`；現在的 `.outputTypeCard__cost` 未選取 `#606692`、選取 `$blue-dark-500`，完全沒有橘色強調——這個「目前選到的這個要花多少顆」的資訊層級在現在的實作裡是遺漏的
6. 圖示大小：Figma `ic_feed` 圖示 11px；現在的 `.outputTypeCard__icon` 是 0.875rem（14px）。圖示本身（`IconFeedBottleSmall.vue`）跟 Figma `ic_feed.svg` 比對路徑資料後確認是同一顆圖示，不需要換圖示元件，只是尺寸不對
7. 間距：Figma 選項之間沒有額外 gap（靠底盤 `gap: 4px` 分隔）；現在的 `.outputTypes` 用 `gap: 0.5rem`（8px）

## Proposed Solution

純 CSS／樣板結構調整，對照 Figma 精確數值：

- `.outputTypes` 改成共用底盤：`background: $blue-light`（`#eff2fa`）、`padding: 0.25rem`（4px）、`gap: 0.25rem`（4px）、`border-radius: 10px`；移除 `flex-wrap`
- `.outputTypeCard` 改成：`flex: 1 0 0`、`padding: 0.4375rem 0.625rem`（7px 10px）、`border-radius: 8px`、移除 `border`、`background: transparent`、移除 `min-width: 6.5rem`
- `.outputTypeCard__label`：`font-size: 0.75rem`（12px）、`font-weight: 400`、`color: #606692`；`.isActive .outputTypeCard__label` 改成 `font-weight: 500`、`color: $blue-dark-500`（字級維持 12px 不變）
- `.outputTypeCard__cost`：`font-size: 0.625rem`（10px）、`color: $gray-100`（`#b4b9c4`，未選取狀態）；`.isActive .outputTypeCard__cost` 改成 `color: $orange`（`#ea903a`，選取狀態的橘色強調）
- `.outputTypeCard__icon`：改成 `width/height: 0.6875rem`（11px）
- `.isActive`：`background: $white`、`box-shadow: 0px 1px 1.5px rgba(0, 0, 0, 0.1)`，移除 `border`

不涉及任何邏輯或資料流變更——`outputTypeOptions` 常數定義、`outputType` 選取邏輯、`o.cost` 顆數資料本身都是對的，只有容器結構與樣式跟設計稿不符。

## Non-Goals

- 不改變 `outputTypeOptions` 常數定義（三個選項的 value／label／cost 資料）與 `outputType` 選取邏輯（`@click="outputType = o.value"`）
- 不改變 `generate()` 生成邏輯與 i18n key 結構（`marketing.outputType.*`）
- 不處理 `MarketingPostView.vue` 同一個檔案裡其他跟這次無關的樣式（商品圖片上傳區、文案輸入框、品牌設定開關、底部生成按鈕）
- 不更換圖示元件——`IconFeedBottleSmall.vue` 已經跟 Figma `ic_feed.svg` 的路徑資料一致，只是目前套用的尺寸不對

## Success Criteria

- `.outputTypes` 呈現共用淺灰底盤（`#eff2fa`），三個選項等寬填滿底盤，選項之間沒有額外邊框
- 未選取的選項背景透明、標籤 Regular 12px `#606692`、顆數文字 10px `#b4b9c4`
- 選取中的選項背景變白、有淺陰影（無邊框）、標籤 Medium 12px `#2e3567`、顆數文字變橘色 `#ea903a`
- 圖示尺寸為 11px
- 瀏覽器截圖跟 Figma node `1440:586` 截圖比對三種狀態（預設「文案＋配圖」選取、切到「只要文案」、切到「只要配圖」）視覺一致
- `npx vue-tsc --noEmit`、`npm run lint` 通過

## Impact

- Affected code:
  - Modified: src/views/MarketingPostView.vue
