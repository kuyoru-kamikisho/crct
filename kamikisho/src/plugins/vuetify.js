import Vue from 'vue'
import Vuetify from 'vuetify/lib/framework'
import {Touch} from 'vuetify/lib/directives'

Vue.directive('touch', Touch)
Vue.use(Vuetify)

export default new Vuetify({
    icons: {
        iconfont: 'mdiSvg',
    },
})
