## 1. 共用按鈕元件

- [x] 1.1 對齊 Requirement「共用按鈕 SHALL 對應 Figma type」：建立 `AppButton.vue` 與六種 Figma variant。（對應 Design 決策「單一元件，以 variant 對應 figma type」）
- [x] 1.2 對齊 Requirement「共用按鈕 SHALL 支援完整互動狀態」：實作 hover、pressed、focus、disabled 與 loading 狀態。
- [x] 1.3 對齊 Requirement「共用按鈕 SHALL 使用一致尺寸」：支援一般、緊湊與帶圖示尺寸。

## 2. 逐頁對照與替換

- [x] 2.1 對照 Figma 元件庫 `btn`（node `170:13`）的 type 與狀態。
- [x] 2.2 替換首頁、生成頁、圖庫、品牌設定、用量與編輯器內符合 `btn` 定義的操作。（對應 Design 決策「頁面對照原則」）
- [x] 2.3 對齊 Requirement「非 btn 控制項 SHALL 保留獨立元件」：保留 chip、tab、option card、icon-only、toolbar 與純文字操作。
- [x] 2.4 移除頁面內重複的按鈕顏色、圓角與互動狀態覆寫。（對應 Design 決策「共用視覺規則」）
- [x] 2.5 移除六個舊按鈕元件並更新相關引用。
- [x] 2.6 將圖庫「上傳圖片」由自訂 label 樣式改為 Figma `btn_icon` primary，補齊 hover、pressed、focus 與鍵盤操作；「從圖庫加入」同步套用 icon 尺寸。

## 3. 驗證

- [x] 3.1 執行 ESLint。
- [x] 3.2 執行 Vitest。
- [x] 3.3 執行 vue-tsc 與 Vite build。
- [x] 3.4 以桌面與手機尺寸進行主要頁面視覺檢查，並確認無水平溢位。
