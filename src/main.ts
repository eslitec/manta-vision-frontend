import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import '@tabler/icons-webfont/dist/tabler-icons.min.css'
import './assets/scss/main.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
