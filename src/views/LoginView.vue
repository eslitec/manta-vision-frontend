<template lang="pug">
.loginView
  form.loginView__panel(@submit.prevent="submit")
    img.loginView__logo(:src="mantagoLogoUrl" alt="MantaGO")
    h1.loginView__title {{ t('auth.title') }}
    label.loginView__field
      span.loginView__fieldLabel {{ t('auth.usernameLabel') }}
      input.loginView__input(
        v-model="username"
        type="text"
        autocomplete="username"
        :placeholder="t('auth.usernamePlaceholder')"
        :aria-invalid="!!errorMessage || undefined"
        @input="errorMessage = ''"
      )
    label.loginView__field
      span.loginView__fieldLabel {{ t('auth.passwordLabel') }}
      input.loginView__input(
        v-model="password"
        type="password"
        autocomplete="current-password"
        :placeholder="t('auth.passwordPlaceholder')"
        :aria-invalid="!!errorMessage || undefined"
        :aria-describedby="errorMessage ? errorId : undefined"
        @input="errorMessage = ''"
      )
    small.loginView__error(v-if="errorMessage" :id="errorId" role="alert") {{ errorMessage }}
    AppButton.loginView__submit(native-type="submit" :loading="session.loading" :disabled="!username.trim() || !password") {{ t('auth.submit') }}
    .loginView__linkRow
      span.loginView__linkPrompt {{ t('auth.noAccountPrompt') }}
      router-link.loginView__link(to="/register") {{ t('auth.goToRegister') }}
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { displayMessage, isInvalidCredentials } from '@/utils/error'
import AppButton from '@/components/AppButton.vue'
import mantagoLogoUrl from '@/assets/images/mantago-logo.svg'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const username = ref('')
const password = ref('')
const errorMessage = ref('')
const errorId = 'login-error'

async function submit() {
  errorMessage.value = ''
  try {
    await session.login(username.value.trim(), password.value)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.push(redirect)
  } catch (e) {
    // 打錯密碼以外的錯（後端沒開、逾時、CORS 被擋）也要說話。
    // 原本是 `throw e`，接上真後端之後那會變成「按了登入完全沒反應」——
    // 後端沒啟動是開發時最常遇到的情況，不能是靜默失敗。
    errorMessage.value = isInvalidCredentials(e)
      ? t('errors.invalidCredentials')
      : displayMessage(e, t('errors.submitFailed'))
  }
}
</script>

<style scoped lang="scss">
.loginView {
  @include authCard;
}
</style>
