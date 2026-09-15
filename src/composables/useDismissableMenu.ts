import { onBeforeUnmount, type Ref } from 'vue'

// 點選單容器以外的地方或按 Escape 即關閉選單，供各種輕量下拉選單共用。
// open/containerRef 都是呼叫端既有的 ref，這裡只負責監聽的綁定與清理，
// 不建立新的狀態、不回傳任何東西——模板裡對 open 的既有引用完全不用改。
export function useDismissableMenu(open: Ref<boolean>, containerRef: Ref<HTMLElement | null>) {
  function onPointerDown(event: PointerEvent) {
    if (!open.value) return
    if (containerRef.value?.contains(event.target as Node)) return
    open.value = false
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open.value) open.value = false
  }

  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKeydown)

  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeydown)
  })
}
