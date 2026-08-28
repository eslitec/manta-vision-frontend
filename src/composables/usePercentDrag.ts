import { usePointerDrag } from './usePointerDrag'

interface PercentDragOptions {
  containerBounds: DOMRect
  elementBounds: DOMRect
  startEvent: PointerEvent
  startX: number
  startY: number
  onDrag: (x: number, y: number) => void
  onEnd?: () => void
}

// 以容器邊界為基準，把指標位移換算成百分比並依元素半寬高夾限在容器內。
// 預設自建一個獨立的 usePointerDrag 實例；只有需要跟其他互動（例如同一物件的
// 拖曳與縮放）共用同一個清理槽位時，才由呼叫端注入現成的 pointerDrag 實例。
export function usePercentDrag(pointerDrag: ReturnType<typeof usePointerDrag> = usePointerDrag()) {
  function start(options: PercentDragOptions) {
    const { containerBounds, elementBounds, startEvent, startX, startY, onDrag, onEnd } = options
    const halfWidth = Math.min(50, (elementBounds.width / containerBounds.width) * 50)
    const halfHeight = Math.min(50, (elementBounds.height / containerBounds.height) * 50)
    pointerDrag.start((moveEvent) => {
      const nextX = startX + ((moveEvent.clientX - startEvent.clientX) / containerBounds.width) * 100
      const nextY = startY + ((moveEvent.clientY - startEvent.clientY) / containerBounds.height) * 100
      onDrag(
        Math.max(halfWidth, Math.min(100 - halfWidth, nextX)),
        Math.max(halfHeight, Math.min(100 - halfHeight, nextY)),
      )
    }, onEnd)
  }

  return { start, stop: pointerDrag.stop }
}
