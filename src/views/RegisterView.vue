<template lang="pug">
.registerView
  form.registerView__panel(@submit.prevent="submit")
    img.registerView__logo(:src="mantagoLogoUrl" alt="MantaGO")
    h1.registerView__title {{ t('auth.registerTitle') }}
    label.registerView__field
      span.registerView__fieldLabel {{ t('auth.usernameLabel') }}
      input.registerView__input(
        v-model="username"
        type="text"
        autocomplete="username"
        :placeholder="t('auth.usernamePlaceholder')"
        :aria-invalid="!!fieldError || undefined"
        @input="fieldError = ''"
      )
    label.registerView__field
      span.registerView__fieldLabel {{ t('auth.passwordLabel') }}
      input.registerView__input(
        v-model="password"
        type="password"
        autocomplete="new-password"
        :placeholder="t('auth.passwordPlaceholder')"
        :aria-invalid="!!fieldError || undefined"
        :aria-describedby="fieldError ? errorId : undefined"
        @input="fieldError = ''"
      )
    small.registerView__error(v-if="fieldError" :id="errorId" role="alert") {{ fieldError }}
    AppButton.registerView__submit(native-type="submit" :loading="session.loading" :disabled="!username.trim() || !password") {{ t('auth.registerSubmit') }}
    .registerView__linkRow
      span.registerView__linkPrompt {{ t('auth.hasAccountPrompt') }}
      router-link.registerView__link(to="/login") {{ t('auth.goToLogin') }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { isUsernameTaken } from '@/utils/error'
import AppButton from '@/components/AppButton.vue'
import mantagoLogoUrl from '@/assets/images/mantago-logo.svg'

const USERNAME_MIN_BYTES = 3
const USERNAME_MAX_BYTES = 50
const PASSWORD_MIN_BYTES = 8
const PASSWORD_MAX_BYTES = 72

const { t } = useI18n()
const router = useRouter()
const session = useSessionStore()

const username = ref('')
const password = ref('')
const fieldError = ref('')
const errorId = 'register-error'

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

function validate(): string {
  const usernameBytes = byteLength(username.value.trim())
  if (usernameBytes < USERNAME_MIN_BYTES) return t('auth.usernameTooShort')
  if (usernameBytes > USERNAME_MAX_BYTES) return t('auth.usernameTooLong')
  const passwordBytes = byteLength(password.value)
  if (passwordBytes < PASSWORD_MIN_BYTES) return t('auth.passwordTooShort')
  if (passwordBytes > PASSWORD_MAX_BYTES) return t('auth.passwordTooLong')
  return ''
}

async function submit() {
  const validationError = validate()
  if (validationError) {
    fieldError.value = validationError
    return
  }
  try {
    await session.register(username.value.trim(), password.value)
    router.push('/')
  } catch (e) {
    if (isUsernameTaken(e)) fieldError.value = t('errors.usernameTaken')
    else throw e
  }
}
</script>

<style scoped lang="scss">
.registerView {
  @include authCard;
}
</style>
