export const interviews = [
  {
    q: '渲染管线有哪些主要阶段？CPU 和 GPU 各自做什么？',
    a: 'CPU 负责准备数据：裁剪可见物体、设置材质常量、发出 Draw Call。GPU 大致经历：顶点着色（模型空间→裁剪空间）→图元装配→光栅化（生成片元）→片元着色（算颜色）→深度/模板测试→颜色混合写入 Framebuffer。TA 要能指出 Draw Call 贵在 CPU 状态切换，三角形贵在 GPU。',
    tags: ['管线']
  },
  {
    q: '点乘和叉乘在图形学里分别用来干什么？',
    a: '点乘得到标量：判断夹角、投影长度、Lambert 的 N·L、判断是否同侧（正负）。叉乘得到向量：三角形法线、切线空间的 binormal、判断绕序（左手/右手）、计算平行四边形面积。二维里叉乘 z 分量常用来判断点在线段哪一侧。',
    tags: ['数学']
  },
  {
    q: '什么是 MVP 矩阵？相乘顺序为什么是 P·V·M·v？',
    a: 'M（Model）把局部坐标变到世界；V（View）把世界变到相机空间；P（Projection）变到裁剪空间。列向量约定下是右乘：P*V*M*v，先应用最右边的 M。面试时要说清引擎是行主序还是列主序，Unity 是列向量左乘矩阵。',
    tags: ['数学', '矩阵']
  },
  {
    q: '透视投影为什么会近大远小？w 分量是什么？',
    a: '透视矩阵把 z 相关的缩放写进齐次坐标的 w。GPU 做透视除法 (x/w, y/w, z/w) 后，离相机越远 |w| 越大，xy 就越小。这也是为什么顶点里要输出 float4，而不能过早点除。',
    tags: ['相机']
  },
  {
    q: 'Lambert、Phong、Blinn-Phong 的区别？',
    a: 'Lambert 只有漫反射：max(N·L,0)。Phong 加高光 (R·V)^n，R 是反射向量。Blinn-Phong 用半角向量 H=(L+V)/|L+V|，算 (N·H)^n，在视点与灯光接近时更稳定也更快。三者都是经验模型，不保证能量守恒。',
    tags: ['光照']
  },
  {
    q: 'PBR 的金属度和粗糙度分别控制什么？',
    a: '粗糙度控制微表面：越粗糙高光越散、反射越糊。金属度在常见 Metallic-Roughness 流程里：非金属用反照率当漫反射、F0≈0.04；金属没有漫反射，反照率当镜面颜色（F0）。能量守恒要求漫反射与镜面此消彼长。',
    tags: ['PBR']
  },
  {
    q: '法线贴图存在切线空间是为什么？',
    a: '切线空间以顶点的 T、B、N 为基，法线贴图的 (0.5,0.5,1) 表示“朝外的平整法线”。模型旋转、骨骼变形时，只要 TBN 跟着变，同一张贴图就能用。世界空间法线贴图做不到骨骼动画，物体空间法线贴图不能共用到不同朝向的网格。',
    tags: ['纹理']
  },
  {
    q: 'sRGB / Gamma 和线性空间为什么重要？',
    a: '显示器和贴图按 sRGB（大约 gamma 2.2）编码。光照是线性运算：一半光能量应对应一半亮度，而不是 128 灰度。若在 gamma 空间做 N·L，暗部会发灰、高光会脏。正确流程：贴图采样后变线性 → 光照 → ToneMapping → 再编码回 sRGB 显示。',
    tags: ['颜色']
  },
  {
    q: 'Draw Call、SetPass、合批、GPU Instancing 怎么区分？',
    a: 'Draw Call 是一次“请 GPU 画这批几何”的命令。SetPass 是切换 Shader/材质状态，通常比 Draw 更贵。合批是把共用状态的网格拼成一次提交。Instancing 是同一网格、同一 Shader、不同 per-instance 数据一次画很多份。SRP Batcher 则是尽量不打断常量缓冲绑定。',
    tags: ['性能']
  },
  {
    q: '半透明为什么难排序？如何处理？',
    a: 'Alpha Blend 不满足交换律，必须从后往前画，且一般关 ZWrite。交叉、互相遮挡、粒子与玻璃无法得到完美顺序。工程上：能 AlphaTest 就不要半透明；屏幕空间贴花；加权混合 OIT；或限制层数。移动端优先减 Overdraw。',
    tags: ['半透明']
  },
  {
    q: '什么是变体爆炸？shader_feature 和 multi_compile 差别？',
    a: '每个 keyword 组合编译一份 Shader，2^n 份。shader_feature 打包时会剥掉没用到的变体（编辑器里通过材质引用收集），适合美术开关。multi_compile 始终保留，适合运行时脚本切换的关键字（雾、阴影）。变体过多会导致包体和加载变慢。',
    tags: ['Shader', 'Unity']
  },
  {
    q: 'URP 和 Built-in 在 TA 工作上最大的差别？',
    a: 'URP 是可编程渲染管线：光照、阴影、后处理路径固定且可在 Renderer Feature 里扩展。Shader 要用 URP 的 include 和 CBUFFER 才能吃到 SRP Batcher。Built-in 更随意但合批、移动端优化更老。从 Built-in 迁 URP 时 Surface Shader 不能直接用。',
    tags: ['Unity']
  },
  {
    q: '如何定位“是 CPU 卡还是 GPU 卡”？',
    a: '看 Profiler：CPU 等待 GPU 是 GPU Bound；GPU 空闲而脚本/渲染提交高是 CPU Bound。再结合 Frame Debugger、RenderDoc、平台 GPU 分析器（Mali、Xcode）。经验：Draw Call 多偏 CPU；超大分辨率全屏特效、Overdraw 偏 GPU。',
    tags: ['性能', '调试']
  },
  {
    q: 'Mipmap 是什么？各向异性过滤呢？',
    a: 'Mipmap 是纹理的一组逐级缩小图，远处用小图减少闪烁和带宽。各向异性过滤（AF）解决“地面斜看”时各向均匀 mip 选错导致的糊。TA 要给纹理开 Generate Mipmaps，并注意 UI 一般不用 mip（会糊）。',
    tags: ['纹理']
  },
  {
    q: '作品集里 TA 岗位最想看到什么？',
    a: '可运行的效果 + 你的思考：问题、方案、对比图、性能数据（Draw Call、ms、包体）。不要只丢最终美图。常见加分项：风格化水体/植被、角色皮肤、工具链（导入检查、批量改材质）、移动端优化前后对比。Shadertoy 链接和 Git 仓库都比 PPT 有用。',
    tags: ['求职']
  }
]
