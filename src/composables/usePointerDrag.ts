// 封裝 window pointermove/pointerup 監聽的綁定與清理樣板，
// 呼叫端只需要提供自己的 onMove 數學。多次呼叫 start() 時，
// 前一次尚未結束的監聽會先被清掉，同一個實例同一時間只有一組監聽在生效。
export function usePointerDrag() {
  let cleanup: (() => void) | undefined

  function start(onMove: (event: PointerEvent) => void, onEnd?: () => void) {
    cleanup?.()
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      cleanup = undefined
      onEnd?.()
    }
    cleanup = onUp
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once: true })
  }

  function stop() {
    cleanup?.()
  }

  return { start, stop }
}
