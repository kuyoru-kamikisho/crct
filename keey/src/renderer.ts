import './index.scss';
import {createApp} from 'vue'
import 'vuetify/styles'
import {createVuetify} from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import App from './components/App.vue'
import {createPinia} from 'pinia'
import '@mdi/font/css/materialdesignicons.css'

const pinia = createPinia()
const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'dark'
    }
})

createApp(App)
    .use(vuetify)
    .use(pinia)
    .mount('#app');
