<template lang="pug">
svg(width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg")
  path(d="M10 1.66667L19.1667 17.5H0.833333L10 1.66667Z" :fill="color")
  path(d="M10.8333 8.33333C10.8333 7.8731 10.4602 7.5 10 7.5C9.53976 7.5 9.16667 7.8731 9.16667 8.33333V11.6667C9.16667 12.1269 9.53976 12.5 10 12.5C10.4602 12.5 10.8333 12.1269 10.8333 11.6667V8.33333Z" fill="white")
  path(d="M10 15.5833C10.5523 15.5833 11 15.1356 11 14.5833C11 14.031 10.5523 13.5833 10 13.5833C9.44772 13.5833 9 14.031 9 14.5833C9 15.1356 9.44772 15.5833 10 15.5833Z" fill="white")
</template>

<script setup lang="ts">
// 大部分用法（一般警示 toast、費用提醒等）維持既有黃色三角；
// 「刪除確認」這類 danger 語意的用法（見 Figma 442:2860／450:3221 opt-in）
// 需要橘紅色（#ff6148），改用 color prop 讓呼叫端指定 currentColor 覆蓋，
// 預設值維持原本的 #F2BB00，避免影響其他已經在用這顆圖示的畫面。
withDefaults(defineProps<{ color?: string }>(), { color: '#F2BB00' })
</script>
