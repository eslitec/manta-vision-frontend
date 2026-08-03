// 繁體中文（預設語言）。之後其他語言檔照這份的 key 結構補齊即可。
export default {
  nav: {
    workbench: 'AI 生成工作台',
    library: '圖庫管理中心',
    usage: '飼料用量',
    settings: '設定',
  },
  topbar: {
    roleAdmin: '管理者',
  },
  lang: {
    label: '語言',
    'zh-Hant': '繁體中文',
    en: 'English',
  },
  feedBadge: {
    unit: '顆',
    topup: '儲值',
  },
  home: {
    title: 'AI 視覺內容工作台',
    subtitle: '選一個任務開始生成，生成結果可存回圖庫集中管理。',
    sectionWhat: '要生成什麼？',
    feedBalance: 'AI 飼料餘額',
    feedHint: '≈ 可生成 {img} 張圖 / {vid} 支短影片',
    generatedThisMonth: '本月已生成',
    unitFeed: '顆',
    unitImages: '張',
    brandDone: '✓ 品牌設定已完成',
    brandHint: '色票・語氣・浮水印皆已設定',
    brandTodo: '○ 品牌設定待完成',
    brandTodoHint: '前往設定補齊品牌資料',
    topup: '＋ 儲值飼料',
    tools: {
      image: { title: '圖生圖', desc: '以參考圖＋文字描述生成新圖，AI 輔助撰寫 prompt。' },
      post: { title: 'AI 產生行銷 PO 文', desc: '商品圖一鍵生成貼文文案與配圖，支援多種比例。' },
      video: { title: '圖生影', desc: '單張圖套用動態模板，生成 5-10 秒短影片。' },
      tryon: { title: 'AI 試穿衣服', desc: '模特照＋服飾素材合成試穿圖，與圖庫直接打通。' },
    },
    libraryCard: {
      title: '圖庫管理中心',
      desc: '所有素材與生成結果的單一來源；各模組從這裡取用，結果可存回並記錄來源鏈。',
      go: '前往圖庫',
    },
  },
}
