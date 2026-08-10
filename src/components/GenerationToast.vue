<template lang="pug">
Teleport(to="body")
  .toast(v-if="toast" :class="`toast--${toast.kind}`")
    span.toast__icon
      IconCheckCircle(v-if="toast.kind === 'done'")
      i.ti.ti-alert-triangle(v-else)
    .toast__body
      .toast__title {{ toast.title }}
      .toast__msg {{ toast.message }}
    button.toast__view(@click="view") {{ t('common.view') }}
    button.toast__close(@click="tasksStore.dismissToast()" :aria-label="t('common.close')")
      i.ti.ti-x
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useGenerationTasksStore } from '@/stores/generationTasks'
import IconCheckCircle from '@/components/icons/IconCheckCircle.vue'

const tasksStore = useGenerationTasksStore()
const { toast } = storeToRefs(tasksStore)
const router = useRouter()
const { t } = useI18n()

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
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1200;
  width: 23.75rem;
  max-width: calc(100vw - 3rem);
  background: $white;
  border-radius: 12px;
  box-shadow: $boxShadowDark;
  padding: 0.875rem 1rem;
  @include flex(flex-start, flex-start, 0.625rem);
}
.toast__icon {
  flex-shrink: 0;
  font-size: 1.25rem;
  color: $red;
  svg {
    display: block;
  }
}
.toast--failed .toast__icon {
  color: $red;
}
.toast__body {
  flex: 1;
  min-width: 0;
}
.toast__title {
  font-size: 0.875rem;
  font-weight: 700;
  color: $blue-dark-300;
  margin-bottom: 0.125rem;
}
.toast__msg {
  font-size: 0.78125rem;
  color: $gray-400;
}
.toast__view {
  flex-shrink: 0;
  font-size: 0.8125rem;
  color: $blue;
  font-weight: 600;
  padding-top: 0.125rem;
}
.toast__close {
  flex-shrink: 0;
  color: $gray-100;
  font-size: 1rem;
  padding-top: 0.125rem;
}
</style>
