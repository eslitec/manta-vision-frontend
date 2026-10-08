## MODIFIED Requirements

### Requirement: 字型選單的九個字體家族與 Figma list_font 逐項一致

文字圖層屬性面板的字型選單 SHALL 提供與 Figma `list_font`（node `1157:872`）一致的字體家族選項，分為「中文」與「英數」兩組共九項，不得多也不得少；選單 SHALL 以自訂 listbox（`role="listbox"` / `role="option"`）呈現分組標頭、字體名稱、副標與選中列打勾，並提供 default／active 兩種 trigger 框線狀態。文字圖層屬性面板本身（Figma node `1157:619`）SHALL 有 16px 內距，且與上方圖層清單之間 SHALL 有 1px 分隔線。

#### Scenario: 文字屬性面板有內距與上方分隔線

- **WHEN** 使用者選取文字圖層，顯示「文字屬性」面板
- **THEN** 面板內容（文字輸入框、字型下拉、色票、字重說明）與面板上下左右邊界保持 16px 內距，面板上方與圖層清單之間有一條分隔線，且「文字屬性」標題與下方第一個輸入框之間保持 10px 間距

#### Scenario: 使用者開啟字型選單

- **WHEN** 使用者點擊字型下拉 trigger
- **THEN** trigger 框線由 `#d2d5dd`（default）變為 `#2e3567`（active），並展開自訂 listbox

##### Example: 九個字體家族分兩組

| 分組                       | 字體                                                                   |
| -------------------------- | ---------------------------------------------------------------------- |
| 中文（思源系列・開放商用） | 思源黑體 Noto Sans TC、思源宋體 Noto Serif TC                          |
| 英數（系統安全字體）       | Inter、Roboto、Arial、Helvetica、Georgia、Times New Roman、Courier New |

#### Scenario: 選單不含設計稿未收錄的字體

- **WHEN** 使用者開啟字型選單
- **THEN** 選單 SHALL NOT 出現 Chiron GoRound TC、霞鶩文楷 TC、jf open 粉圓、芫荽

#### Scenario: 使用者選取一個字體家族

- **WHEN** 使用者在 listbox 點選某個字體家族
- **THEN** 該列以 Medium 500 字重與 `#eff2fa` 底色標示為選中，並顯示 14×14 打勾圖示
