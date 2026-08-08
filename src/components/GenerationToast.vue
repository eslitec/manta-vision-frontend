<template lang="pug">
Teleport(to="body")
  .toast(v-if="toast" :class="`toast--${toast.kind}`")
    span.toast__icon
      IconCheckCircle(v-if="toast.kind === 'done'")
      i.ti.ti-alert-triangle(v-else)
    .toast__body
      .toast__title {{ toast.title }}
      .toast__msg {{ toast.message }}
    button.toast__view(@click="view") 查看
    button.toast__close(@click="tasksStore.dismissToast()" aria-label="關閉")
      i.ti.ti-x
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'

const tasksStore = useGenerationTasksStore()
const { toast } = storeToRefs(tasksStore)
const router = useRouter()

let timer: number | undefined
watch(toast, (v) => {
  if (timer) window.clearTimeout(timer)
  if (v) timer = window.setTimeout(() => tasksStore.dismissToast(), 6000)
})

function view() {
  router.push('/library')
  tasksStore.dismissToast()
}
</script>

<style scoped lang="scss">
.toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 1200; width: 380px; max-width: calc(100vw - 48px);
  background: $white; border-radius: 12px; box-shadow: $boxShadowDark; padding: 14px 16px;
  @include flex(flex-start, flex-start, 10px);
}
.toast__icon { flex-shrink: 0; font-size: 20px; color: $red;
  svg { display: block; } }
.toast--failed .toast__icon { color: $red; }
.toast__body { flex: 1; min-width: 0; }
.toast__title { font-size: 14px; font-weight: 700; color: $blue-dark-300; margin-bottom: 2px; }
.toast__msg { font-size: 12.5px; color: $gray-400; }
.toast__view { flex-shrink: 0; font-size: 13px; color: $blue; font-weight: 600; padding-top: 2px; }
.toast__close { flex-shrink: 0; color: $gray-100; font-size: 16px; padding-top: 2px; }
</style>
