import { defineStore } from "pinia";

export default defineStore('useWebContext', {
    state: () => ({
        deps: null as DepsObject
    }),
    actions: {
        setDeps(deps: DepsObject) {
            this.deps = deps
        }
    }
})