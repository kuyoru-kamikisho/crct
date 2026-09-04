<template>
  <div id="home">
    <video autoplay loop muted class="k-img-cov">
      <source src="@/assets/index/video/ngnl-shuubi.mp4" type="video/webm" />
    </video>
    <div class="k-black-cover"></div>
  </div>
</template>

<script>
export default {
  name: "Background",
  data: () => ({
    load: false
  }),
  methods: {
    _isMobile() {
      let flag = navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i);
      return flag;
    },
  },
  beforeMount() {
    if (this._isMobile())
      this.$data.load = false
    else
      this.$data.load = false
  }
}
</script>

<style scoped lang="less">
#home {
  position: relative;
}

.k-img-cov {
  min-width: 100%;
  min-height: 100%;
  object-fit: contain;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
}

.k-black-cover {
  background-color: rgba(0, 0, 0, 0.7);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}
</style>