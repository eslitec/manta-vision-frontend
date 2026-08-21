<template lang="pug">
.loginView
  form.loginView__panel(@submit.prevent="submit")
    .loginView__brand
      span.loginView__avatar
      .loginView__brandText
        strong {{ t('brand.name') }}
        small Manta Vision
    h1.loginView__title {{ t('auth.title') }}
    label.loginView__field
      span.loginView__fieldLabel {{ t('auth.usernameLabel') }}
      input.loginView__input(
        v-model="username"
        type="text"
        autocomplete="username"
        :placeholder="t('auth.usernamePlaceholder')"
        :aria-invalid="showError || undefined"
        @input="showError = false"
      )
    label.loginView__field
      span.loginView__fieldLabel {{ t('auth.passwordLabel') }}
      input.loginView__input(
        v-model="password"
        type="password"
        autocomplete="current-password"
        :placeholder="t('auth.passwordPlaceholder')"
        :aria-invalid="showError || undefined"
        :aria-describedby="showError ? errorId : undefined"
        @input="showError = false"
      )
    small.loginView__error(v-if="showError" :id="errorId" role="alert") {{ t('errors.invalidCredentials') }}
    AppButton.loginView__submit(native-type="submit" :loading="session.loading" :disabled="!username.trim() || !password") {{ t('auth.submit') }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { isInvalidCredentials } from '@/utils/error'
import AppButton from '@/components/AppButton.vue'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const username = ref('')
const password = ref('')
const showError = ref(false)
const errorId = 'login-error'

async function submit() {
  try {
    await session.login(username.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (e) {
    if (isInvalidCredentials(e)) showError.value = true
    else throw e
  }
}
</script>

<style scoped lang="scss">
.loginView {
  @include flex(center, center);
  min-height: 100vh;
  padding: 1.5rem;

  &__panel {
    display: flex;
    width: 22.5rem;
    max-width: 100%;
    flex-direction: column;
    gap: 1.25rem;
    padding: 2rem;
    border-radius: 10px;
    background: $white;
    box-shadow: 0px 4px 7px 0px rgba(96, 100, 114, 0.2);
  }

  &__brand {
    @include flex(flex-start, center, 0.75rem);
  }

  &__avatar {
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    border-radius: 50%;
    background: $blue-dark-500;
  }

  &__brandText {
    display: flex;
    flex-direction: column;
    color: $blue-dark-500;

    strong {
      font-size: 1rem;
      font-weight: 700;
    }

    small {
      font-size: 0.75rem;
      color: $gray-100;
    }
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: $dark-blue-gray;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  &__fieldLabel {
    font-size: 0.75rem;
    font-weight: 500;
    color: $blue-dark-500;
  }

  &__input {
    width: 100%;
    height: 2.25rem;
    padding: 0.5rem 0.875rem;
    border: 1px solid $gray;
    border-radius: 18px;
    color: $blue-dark-500;
    font: inherit;
    font-size: 0.875rem;

    &::placeholder {
      color: $gray-100;
    }

    &:focus-visible {
      border-color: $blue-dark-500;
      outline: 2px solid rgba(46, 53, 103, 0.2);
      outline-offset: 1px;
    }

    &[aria-invalid='true'] {
      border-color: $red;
    }
  }

  &__error {
    color: $red;
    font-size: 0.75rem;
  }

  &__submit {
    width: 100%;
  }
}
</style>
