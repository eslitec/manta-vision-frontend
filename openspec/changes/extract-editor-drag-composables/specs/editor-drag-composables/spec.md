## ADDED Requirements

### Requirement: 拖曳事件綁定 SHALL 透過共用的 usePointerDrag composable

編輯器內任何需要監聽 window `pointermove`／`pointerup` 來實作拖曳或縮放互動的程式碼，SHALL 透過共用的 `usePointerDrag` composable 綁定與清理事件，SHALL NOT 在個別 handler 內各自手寫 `window.addEventListener`／`window.removeEventListener` 與清理變數。

#### Scenario: 開始一次新的拖曳前清掉前一次殘留的監聽

- **WHEN** 使用者在前一次拖曳的 pointerup 尚未觸發時（例如快速連續按下）又開始一次新的拖曳
- **THEN** `usePointerDrag` SHALL 先清掉前一次尚未結束的 pointermove／pointerup 監聽，再綁定這一次的監聽，避免同時有兩組監聽同時作用

##### Example: 連續觸發 startCropResize 兩次

- **GIVEN** 使用者按住裁切框的角落開始拖曳（第一次 `start` 呼叫），尚未放開滑鼠
- **WHEN** 同一個角落又被按下（第二次 `start` 呼叫）
- **THEN** 第一次呼叫綁定的 pointermove／pointerup 監聽 SHALL 在第二次呼叫綁定新監聽之前被移除，畫面上只有最新一次拖曳在生效

### Requirement: 容器邊界百分比位置拖曳 SHALL 透過共用的 usePercentDrag composable

以容器（artboard）邊界為基準、把指標移動量換算成百分比並依被拖曳元素的半寬高夾限在容器範圍內的拖曳邏輯，SHALL 透過共用的 `usePercentDrag` composable 實作，SHALL NOT 在多個 handler 內各自重複相同的百分比換算與夾限數學。

#### Scenario: 拖曳到超出容器邊界的位置會被夾限

- **WHEN** 使用者把文字圖層或素材圖層拖曳到超出 artboard 邊界的位置
- **THEN** `usePercentDrag` SHALL 把座標夾限在 `[半寬, 100 - 半寬]`（x 軸）與 `[半高, 100 - 半高]`（y 軸）範圍內，不允許元素中心移出容器

##### Example: 半寬 10% 的圖層拖到容器左側外

- **GIVEN** 一個半寬為 10（百分比）的圖層，容器寬度視為 100
- **WHEN** 使用者把指標移動到相當於 x = -20 的位置
- **THEN** 圖層最終 x 座標 SHALL 被夾限為 10（即半寬），不會是 -20
