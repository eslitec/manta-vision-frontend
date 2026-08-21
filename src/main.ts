import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './lang'
import { useSessionStore } from './stores/session'
import './assets/scss/main.scss'

const app = createApp(App)
app.use(createPinia())
useSessionStore().restore()
app.use(router)
app.use(i18n)
app.mount('#app')
