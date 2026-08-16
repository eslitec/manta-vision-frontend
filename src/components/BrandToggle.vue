<template lang="pug">
.brandtoggle(:class="{ 'isOn': enabled && !unset, 'isUnset': unset }")
  button.brandtoggle__control(type="button" role="switch" :aria-checked="enabled" :disabled="unset" @click="toggle")
    span.brandtoggle__switch(:class="{ 'isOn': enabled }" aria-hidden="true")
      span.brandtoggle__knob
    .brandtoggle__col
      span.brandtoggle__title {{ unset ? t('brandToggle.unsetTitle') : t('brandToggle.title') }}
      span.brandtoggle__sub {{ resolvedDescription }}
  button.brandtoggle__edit(type="button" @click.stop="emit('edit')") {{ unset ? t('brandToggle.goToSettings') : t('common.edit') }}
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(defineProps<{ description?: string; unset?: boolean }>(), {
  description: undefined,
  unset: false,
})
const emit = defineEmits<{ edit: [] }>()
const enabled = defineModel<boolean>({ required: true })

const { t } = useI18n()
const resolvedDescription = computed(() =>
  props.unset ? t('brandToggle.unsetDescription') : (props.description ?? t('brandToggle.defaultDescription')),
)
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
  text-align: left;
  &.isOn {
    background: $blue-light;
    border-color: transparent;
  }

  &.isUnset {
    border-color: transparent;
    border-left: 3px solid $yellow;
    background: $blue-light;
    padding-left: 0.5625rem;
  }
  &__control {
    @include flex(flex-start, center, 0.625rem);
    flex: 1;
    min-width: 0;
    color: inherit;
    text-align: left;
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
  &.isOn &__title {
    color: $dark-blue-gray;
  }
  &.isUnset &__control {
    opacity: 0.3;
    cursor: not-allowed;
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
