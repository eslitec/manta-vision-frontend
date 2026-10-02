<template lang="pug">
.authForm
  form.authForm__panel(@submit.prevent="submit")
    img.authForm__logo(:src="mantagoLogoUrl" alt="MantaGO")
    h1.authForm__title {{ title }}
    label.authForm__field
      span.authForm__fieldLabel {{ t('auth.usernameLabel') }}
      input.authForm__input(
        v-model="username"
        type="text"
        autocomplete="username"
        :placeholder="t('auth.usernamePlaceholder')"
        :aria-invalid="!!errorMessage || undefined"
        @input="errorMessage = ''"
      )
    label.authForm__field
      span.authForm__fieldLabel {{ t('auth.passwordLabel') }}
      input.authForm__input(
        v-model="password"
        type="password"
        :autocomplete="passwordAutocomplete"
        :placeholder="t('auth.passwordPlaceholder')"
        :aria-invalid="!!errorMessage || undefined"
        :aria-describedby="errorMessage ? errorId : undefined"
        @input="errorMessage = ''"
      )
    small.authForm__error(v-if="errorMessage" :id="errorId" role="alert") {{ errorMessage }}
    AppButton.authForm__submit(native-type="submit" :loading="session.loading" :disabled="!username.trim() || !password") {{ submitLabel }}
    .authForm__linkRow
      span.authForm__linkPrompt {{ linkPrompt }}
      router-link.authForm__link(:to="linkTo") {{ linkText }}
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { displayMessage, isInvalidCredentials, isUsernameTaken } from '@/utils/error'
import AppButton from '@/components/AppButton.vue'
import mantagoLogoUrl from '@/assets/images/mantago-logo.svg'

const USERNAME_MIN_BYTES = 3
const USERNAME_MAX_BYTES = 50
const PASSWORD_MIN_BYTES = 8
const PASSWORD_MAX_BYTES = 72

const props = defineProps<{
  mode: 'login' | 'register'
}>()

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const errorId = computed(() => `${props.mode}-error`)

const title = computed(() => (props.mode === 'login' ? t('auth.title') : t('auth.registerTitle')))
const submitLabel = computed(() => (props.mode === 'login' ? t('auth.submit') : t('auth.registerSubmit')))
const passwordAutocomplete = computed(() => (props.mode === 'login' ? 'current-password' : 'new-password'))
const linkPrompt = computed(() => (props.mode === 'login' ? t('auth.noAccountPrompt') : t('auth.hasAccountPrompt')))
const linkText = computed(() => (props.mode === 'login' ? t('auth.goToRegister') : t('auth.goToLogin')))
const linkTo = computed(() => (props.mode === 'login' ? '/register' : '/login'))

function byteLength(s: string): number {
  return new TextEncoder().encode(s).length
}

function validateRegisterFields(): string {
  const usernameBytes = byteLength(username.value.trim())
  if (usernameBytes < USERNAME_MIN_BYTES) return t('auth.usernameTooShort')
  if (usernameBytes > USERNAME_MAX_BYTES) return t('auth.usernameTooLong')
  const passwordBytes = byteLength(password.value)
  if (passwordBytes < PASSWORD_MIN_BYTES) return t('auth.passwordTooShort')
  if (passwordBytes > PASSWORD_MAX_BYTES) return t('auth.passwordTooLong')
  return ''
}

async function submit() {
  errorMessage.value = ''

  if (props.mode === 'register') {
    const validationError = validateRegisterFields()
    if (validationError) {
      errorMessage.value = validationError
      return
    }
  }

  try {
    if (props.mode === 'login') {
      await session.login(username.value.trim(), password.value)
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      router.push(redirect)
    } else {
      await session.register(username.value.trim(), password.value)
      router.push('/')
    }
  } catch (e) {
    // 打錯密碼／帳號已被使用以外的錯（後端沒開、逾時、CORS 被擋）也要說話。
    // 不能是靜默失敗，後端沒啟動是開發時最常遇到的情況。
    errorMessage.value =
      props.mode === 'login'
        ? isInvalidCredentials(e)
          ? t('errors.invalidCredentials')
          : displayMessage(e, t('errors.submitFailed'))
        : isUsernameTaken(e)
          ? t('errors.usernameTaken')
          : displayMessage(e, t('errors.submitFailed'))
  }
}
</script>

<style scoped lang="scss">
.authForm {
  @include authCard;
}
</style>
