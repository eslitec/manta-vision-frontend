import { nextTick, onBeforeUnmount, watch, type Ref } from 'vue'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useAccessibleDialog(open: Ref<boolean>, dialogRef: Ref<HTMLElement | null>, close: () => void) {
  let returnFocus: HTMLElement | null = null
  let previousBodyOverflow = ''
  let appWasInert = false

  const focusableElements = () =>
    dialogRef.value ? Array.from(dialogRef.value.querySelectorAll<HTMLElement>(focusableSelector)) : []

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key !== 'Tab') return
    const items = focusableElements()
    if (!items.length) {
      event.preventDefault()
      dialogRef.value?.focus()
      return
    }

    const first = items[0]
    const last = items[items.length - 1]
    if (!dialogRef.value?.contains(document.activeElement)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first)?.focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  const restore = () => {
    document.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = previousBodyOverflow
    const app = document.querySelector<HTMLElement>('#app')
    if (app) app.inert = appWasInert
    returnFocus?.focus()
    returnFocus = null
  }

  watch(open, async (isOpen) => {
    if (!isOpen) {
      restore()
      return
    }

    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const app = document.querySelector<HTMLElement>('#app')
    if (app) {
      appWasInert = app.inert
      app.inert = true
    }
    document.addEventListener('keydown', onKeydown)
    await nextTick()
    const initial = dialogRef.value?.querySelector<HTMLElement>('[data-dialog-initial-focus]') ?? focusableElements()[0]
    ;(initial ?? dialogRef.value)?.focus()
  })

  onBeforeUnmount(restore)
}
