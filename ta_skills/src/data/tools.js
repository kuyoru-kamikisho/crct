export const toolGroups = [
  {
    title: '引擎',
    items: [
      { name: 'Unity Hub', desc: 'Unity 引擎安装与多版本管理，TA 入门首选。', url: 'https://unity.com/download', icon: 'mdi-unity' },
      { name: 'Unreal Engine', desc: '影视级渲染与材质节点，大厂TA常备。', url: 'https://www.unrealengine.com/download', icon: 'mdi-unreal' },
      { name: 'Godot', desc: '开源轻量，适合学渲染概念和做小 demo。', url: 'https://godotengine.org/download', icon: 'mdi-godot' }
    ]
  },
  {
    title: 'DCC 与贴图',
    items: [
      { name: 'Blender', desc: '免费建模、UV、烘焙，作品集完全够用。', url: 'https://www.blender.org/download/', icon: 'mdi-blender-software' },
      { name: 'Substance 3D', desc: '行业标准材质与纹理流程（Painter / Designer）。', url: 'https://www.adobe.com/products/substance3d.html', icon: 'mdi-palette-outline' },
      { name: 'ArmorPaint', desc: '开源 PBR 绘制，替代 Painter 练手。', url: 'https://armorpaint.org/', icon: 'mdi-brush-variant' }
    ]
  },
  {
    title: '调试与抓帧',
    items: [
      { name: 'RenderDoc', desc: '跨 API 抓帧神器，看 Draw、贴图、Shader 常量。', url: 'https://renderdoc.org/', icon: 'mdi-bug-outline' },
      { name: 'Unity Frame Debugger', desc: '引擎内逐 Draw 查看，定位合批与 Pass。', url: 'https://docs.unity3d.com/Manual/FrameDebugger.html', icon: 'mdi-magnify-scan' },
      { name: 'NVIDIA Nsight / AMD RGP', desc: '厂商级 GPU Profiler，深入看瓶颈。', url: 'https://developer.nvidia.com/nsight-graphics', icon: 'mdi-chip' }
    ]
  },
  {
    title: '学习与实验',
    items: [
      { name: 'Shadertoy', desc: '浏览器里写 GLSL，大量可拆解的效果。', url: 'https://www.shadertoy.com/', icon: 'mdi-code-braces' },
      { name: 'three.js editor', desc: '网页 3D，快速验证相机、光照、材质。', url: 'https://threejs.org/editor/', icon: 'mdi-web' },
      { name: 'LearnOpenGL', desc: '图形学实现向教程，管线与光照写得很清楚。', url: 'https://learnopengl.com/', icon: 'mdi-book-open-page-variant' }
    ]
  }
]
