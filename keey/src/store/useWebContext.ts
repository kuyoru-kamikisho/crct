import {defineStore} from "pinia";

export default defineStore('useWebContext', {
    state: () => ({
        cantDeleteGroup: [0, 1],
        enabledGroup: 0,
        opacity: 60,
        deps: null as DepsObject
    }),
    actions: {
        setDeps(deps: DepsObject) {
            this.deps = deps
            this.enabledGroup = deps.settings.enabledGroup
            this.opacity = deps.settings.opacity
        },
        setOpacity(num: number) {
            this.opacity = num
        },
        setEnabledGroup(num: number) {
            this.enabledGroup = num
        }
    },
    getters: {
        getEnabledGroup: (s) => s.deps?.keymaps[s.enabledGroup] as KeymapObject | null,
        getOpacity: (s) => s.opacity
    }
})