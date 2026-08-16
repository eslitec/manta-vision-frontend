<template lang="pug">
component.appButton(
  :is="tag"
  :type="tag === 'button' ? nativeType : undefined"
  :disabled="tag === 'button' ? disabled || loading : undefined"
  :aria-disabled="tag !== 'button' && (disabled || loading) ? 'true' : undefined"
  :aria-busy="loading || undefined"
  :class="[`appButton--${variant}`, `appButton--${size}`, { 'appButton--icon': icon, 'isLoading': loading }]"
)
  span.appButton__spinner(v-if="loading" aria-hidden="true")
  slot
</template>

<script setup lang="ts">
export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'alert' | 'ghost' | 'subtle'

withDefaults(
  defineProps<{
    variant?: AppButtonVariant
    size?: 'medium' | 'compact'
    tag?: string
    nativeType?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    icon?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'medium',
    tag: 'button',
    nativeType: 'button',
  },
)
</script>

<style scoped lang="scss">
.appButton {
  @include flex(center, center, 0.375rem);
  min-width: 0;
  height: 2.25rem;
  padding: 0.5625rem 1rem;
  border: 1px solid transparent;
  border-radius: 18px;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.125rem;
  white-space: nowrap;
  transition:
    background-color 0.15s,
    border-color 0.15s,
    color 0.15s,
    opacity 0.15s,
    transform 0.1s;

  &--icon {
    padding-right: 0.875rem;
    padding-left: 0.625rem;
    border-radius: 16px;
  }

  &--compact {
    height: 1.875rem;
    padding: 0.375rem 0.875rem;
    border-radius: 16px;
  }

  &--primary,
  &--secondary,
  &--outline,
  &--alert {
    box-shadow: $btnBoxShadow;
  }

  &--primary {
    background: $blue-dark-500;
    color: $white;

    &:hover:not(:disabled) {
      background: #606692;
    }

    &:active:not(:disabled) {
      background: #14193f;
    }
  }

  &--secondary {
    background: $orange;
    color: $white;

    &:hover:not(:disabled) {
      background: $orange-light;
    }

    &:active:not(:disabled) {
      background: $orange-dark;
    }
  }

  &--outline {
    border-color: $blue-dark-500;
    background: $white;
    color: $blue-dark-500;

    &:hover:not(:disabled) {
      border-color: #606692;
      color: #606692;
    }

    &:active:not(:disabled) {
      border-color: #14193f;
      color: #14193f;
    }
  }

  &--alert {
    border-color: #ff6148;
    background: $white;
    color: #ff6148;

    &:hover:not(:disabled) {
      border-color: #ff8a78;
      color: #ff8a78;
    }

    &:active:not(:disabled) {
      border-color: #d93e28;
      color: #d93e28;
    }
  }

  &--ghost {
    background: transparent;
    color: #606692;

    &:hover:not(:disabled) {
      background: $blue-light;
      color: $blue-dark-500;
    }

    &:active:not(:disabled) {
      background: $gray;
      color: #14193f;
    }
  }

  &--subtle {
    background: $blue-light;
    color: $blue-dark-500;

    &:hover:not(:disabled) {
      background: #e2e7f5;
    }

    &:active:not(:disabled) {
      background: $gray;
      color: #14193f;
    }
  }

  &:focus-visible {
    outline: 2px solid $yellow;
    outline-offset: 2px;
    box-shadow:
      $btnBoxShadow,
      0 0 0 4px $blue-dark-500;
  }

  &:disabled,
  &[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.3;
  }

  &:active:not(:disabled) {
    transform: translateY(0.0625rem);
  }

  &__spinner {
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: appButtonSpin 0.7s linear infinite;
  }
}

@keyframes appButtonSpin {
  to {
    transform: rotate(1turn);
  }
}
</style>
