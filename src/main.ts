import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './lang'
import { installSessionGuard } from './api/sessionGuard'
import { useSessionStore } from './stores/session'
import './assets/scss/main.scss'

const app = createApp(App)
app.use(createPinia())

const session = useSessionStore()
session.restore()

// token 過期或失效時把人清乾淨並導回登入頁（行為與測試都在 api/sessionGuard.ts）
installSessionGuard(session, router)

app.use(router)
app.use(i18n)
app.mount('#app')
