<template>
  <v-app id="app">

    <CursorCollimator v-if="showCursor"></CursorCollimator>

    <Background></Background>

    <NavigationBar ref="Nav"></NavigationBar>

    <transition enter-active-class="k-animated bounceInRight" leave-active-class="k-animated bounceOutRight">
      <S2Plugin v-if="this.$store.state.s2p"></S2Plugin>
    </transition>

    <v-main>

      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <HomePage v-if="this.$store.state.navbar[0]"></HomePage>
      </transition>

      <transition enter-active-class="k-animated k-fadeInDown" leave-active-class="k-animated k-fadeOutUp">
        <Constrain v-if="this.$store.state.navbar[1]"></Constrain>
      </transition>

      <transition enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
        <Price v-if="this.$store.state.navbar[2]"></Price>
      </transition>

      <transition enter-active-class="k-animated k-fadeInDown" leave-active-class="k-animated k-fadeOutUp">
        <PreviousWorks v-if="this.$store.state.navbar[3]"></PreviousWorks>
      </transition>

      <transition enter-active-class="k-animated k-fadeInRight" leave-active-class="k-animated k-fadeOutRight">
        <LoginPage v-if="this.$store.state.navbar[4]"></LoginPage>
      </transition>

      <transition enter-active-class="k-animated k-bounceInDown" leave-active-class="k-animated k-bounceOutUp">
        <ExtraPage v-if="this.$store.state.homepageExtra"></ExtraPage>
      </transition>

    </v-main>

    <Tamago v-if="this.$store.state.tamago"></Tamago>

  </v-app>
</template>

<script>
import "./assets/global/css-less/global.less"
import NavigationBar from "@/components/index/NavigationBar.vue";
import ExtraPage from "@/components/index/ExtraPage.vue";
import Background from "@/components/index/Background.vue";

const app_main = {
  name: 'App',
  components: {
    NavigationBar,
    ExtraPage,
    Background,
    HomePage: () => import("@/components/index/HomePage.vue"),
    LoginPage: () => import("@/components/index/LoginPage.vue"),
    Constrain: () => import("@/components/index/ConstraintsInfo.vue"),
    Tamago: () => import("@/components/index/Tamago.vue"),
    Price: () => import("@/components/index/Price.vue"),
    PreviousWorks: () => import("@/components/index/PreviousWorks.vue"),
    S2Plugin: () => import("@/components/index/S2-Plugin.vue"),
    CursorCollimator: () => import("@/components/global/CursorCollimator.vue"),
  },
  data: () => ({
    myInfo: "App.vue",
    showCursor: false,
  }),
  methods: {
    /**
     * Tab键调出搜索页
     * @param e
     */
    hp(e) {
      const _this = () => this.$refs.Nav.homepageExCommit()
      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        _this()
      }
    },
    deferNonCritical() {
      const idle = typeof requestIdleCallback === 'function'
          ? (cb) => requestIdleCallback(cb, {timeout: 1800})
          : (cb) => setTimeout(cb, 1)

      idle(() => {
        const motionOk = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const isPointerFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
        if (motionOk) {
          import("./assets/global/js-effects/sakura-float.js")
        }
        if (isPointerFine) {
          this.showCursor = true
        }
      })
    },
  },
  mounted() {
    document.addEventListener('keydown', (e) => this.hp(e))
    this.deferNonCritical()
  }
};

export default app_main
</script>

<style scoped lang="less">
#app {
  font-family: sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>
