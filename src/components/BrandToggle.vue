<template lang="pug">
.brandtoggle(:class="{ 'isOn': enabled }" @click="toggle")
  span.brandtoggle__switch(:class="{ 'isOn': enabled }")
    span.brandtoggle__knob
  .brandtoggle__col
    span.brandtoggle__title {{ t('brandToggle.title') }}
    span.brandtoggle__sub {{ resolvedDescription }}
  span.brandtoggle__edit(@click.stop="emit('edit')") {{ t('common.edit') }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ description?: string }>()
const emit = defineEmits<{ edit: [] }>()
const enabled = defineModel<boolean>({ required: true })

const { t } = useI18n()
const resolvedDescription = computed(() => props.description ?? t('brandToggle.defaultDescription'))
const toggle = () => (enabled.value = !enabled.value)
</script>

<style scoped lang="scss">
.brandtoggle {
  @include flex(flex-start, center, 0.625rem);
  background: $white;
  border: 1px solid $gray;
  border-radius: 8px;
  padding: 0.625rem 0.75rem;
  width: 100%;
  cursor: pointer;
  &.isOn {
    background: $blue-light;
    border-color: transparent;
  }
  &__switch {
    width: 2rem;
    height: 1.125rem;
    border-radius: 9px;
    background: $gray;
    position: relative;
    flex-shrink: 0;
    transition: background 0.15s;
    &.isOn {
      background: $blue-dark-500;
    }
  }
  &__knob {
    position: absolute;
    top: 0.125rem;
    left: 0.125rem;
    width: 0.875rem;
    height: 0.875rem;
    border-radius: 50%;
    background: $white;
    transition: transform 0.15s;
  }
  &__switch.isOn &__knob {
    transform: translateX(0.875rem);
  }
  &__col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }
  &__title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #606692;
  }
  &__sub {
    font-size: 0.75rem;
    color: $gray-100;
  }
  &__edit {
    font-size: 0.75rem;
    font-weight: 500;
    color: $blue-dark-500;
    flex-shrink: 0;
  }
}
</style>
