export const problems = [
  {
    id: 'pink-shader',
    title: '材质变洋红 / Shader 报错变粉',
    tags: ['Unity', 'Shader', '调试'],
    summary: '场景里物体突然变成洋红色，几乎一定是 Shader 编译失败或变体缺失。',
    symptoms: ['物体洋红（Hot Pink）', 'Console 有 shader error', '打包后某平台才粉'],
    causes: [
      '语法错误、未定义的变量或 include 路径写错',
      '当前渲染管线（Built-in / URP / HDRP）与 Shader 不匹配',
      '某关键字变体没编译进去（shader_feature vs multi_compile）',
      '目标平台不支持该 Shader Model'
    ],
    steps: [
      '打开 Console，定位具体文件和行号，先修编译错误。',
      '确认项目管线：Edit → Project Settings → Graphics / URP Asset。Built-in 的 Shader 不能直接给 URP 用。',
      '在 Frame Debugger 里看实际用的是哪个 Pass、哪个 Keyword。',
      '如果只在打包后出现：检查 Shader Stripping，把会用到的 keyword 改成 multi_compile 或加 ShaderVariantCollection。'
    ]
  },
  {
    id: 'too-many-drawcalls',
    title: 'Draw Call 过高导致掉帧',
    tags: ['性能', '合批', '移动端'],
    summary: '同屏物体很多但面数并不高时，瓶颈通常在 SetPass / Draw Call 而不是三角形。',
    symptoms: ['Profiler 里 Rendering / SetPass Calls 很高', '低端安卓明显卡', '相同材质重复提交'],
    causes: [
      '材质实例化过多（改了 _Color 就 new 出一个实例）',
      '没有开 GPU Instancing / SRP Batcher',
      '过多不同 Shader Pass（阴影、outline 再画一遍）',
      'UI 与 3D 交替打断合批'
    ],
    steps: [
      'Frame Debugger 看合批被谁打断：材质不同、缩放负值、光照不同都可能打断。',
      '相同外观尽量共用一张材质；颜色变化用顶点色或 MaterialPropertyBlock。',
      '静态物体打开 Static Batching；重复网格打开 GPU Instancing。',
      'URP 确认 SRP Batcher 开启，Shader 不要在 CBUFFER 外乱放属性。'
    ]
  },
  {
    id: 'z-fighting',
    title: '两个面闪烁（Z-Fighting）',
    tags: ['深度', '场景'],
    summary: '几乎共面的两个三角形在深度缓冲里来回赢，看起来像斑马纹闪烁。',
    symptoms: ['贴花 / 地面叠一层就闪', '远景更严重', '移动相机时条纹会动'],
    causes: [
      '两个表面距离小于深度缓冲精度',
      '相机 far/near 比值过大（near 太小、far 太大）',
      '没有用 Offset / 模板 / 投影贴花方案'
    ],
    steps: [
      '先把 Camera Near 适当增大（例如 0.1 → 0.3），Far 能小就小。',
      '能合并的网格就合并，不要叠两层几乎一样的面。',
      '贴花用 Decal 或深度偏移：Offset -1, -1（注意移动端精度）。',
      '超大世界考虑相机相对渲染（Camera Relative Rendering）或拆成多场景。'
    ]
  },
  {
    id: 'uv-seam',
    title: 'UV 接缝漏光 / 法线硬边',
    tags: ['UV', '法线', '烘焙'],
    summary: '模型接缝处出现亮线、黑线或法线突变，常见于拆 UV 后没处理切线。',
    symptoms: ['接缝一条亮边', '法线贴图“搓衣板”', '光照贴图漏光'],
    causes: [
      'UV 没有留 padding，过滤采样跨到另一块',
      '切线没有按 UV 缝硬化（MikkTSpace 不一致）',
      '烘焙法线用的 cages / 光滑组与实时导入设置不同'
    ],
    steps: [
      'UV 岛之间至少留 4–8 px padding（看纹理分辨率）。',
      'DCC 与引擎统一使用 MikkTSpace，导入时 Compute Tangents 保持一致。',
      '硬边处拆 UV，软边处不要无故断开。',
      '光照贴图 UV2 同样要 padding，检查 Lightmap Dilate。'
    ]
  },
  {
    id: 'overdraw',
    title: '半透明过多导致 Overdraw',
    tags: ['半透明', '粒子', 'UI'],
    summary: '多层 alpha 混合会让同一像素被画很多次，移动端带宽立刻爆炸。',
    symptoms: ['粒子一开帧率腰斩', '全屏 UI 模糊、扫光卡顿', 'GPU Bound 但三角形不多'],
    causes: [
      '大面积粒子贴图、中心不透明四周渐隐仍按半透明排序',
      '全屏 Image 叠多层',
      '关闭 ZWrite 后无法早剔除'
    ],
    steps: [
      'Scene 视图开 Overdraw 模式，越白越贵。',
      '能用 Cutout / Alpha To Coverage 的不要用 Blend。',
      '粒子缩小贴图、减少层数，用 GPU 粒子或网格粒子替代全屏片。',
      'UI 合并图集，避免全屏半透明遮罩常驻。'
    ]
  },
  {
    id: 'gamma-grey',
    title: '场景发灰、光照怎么调都不对',
    tags: ['颜色', '线性空间'],
    summary: '在 Gamma 空间做光照，或贴图没标 sRGB，结果就是脏、灰、暗。',
    symptoms: ['暗部发灰', 'PBR 金属不像金属', '和参考图差一档曝光'],
    causes: [
      '项目还在 Gamma Color Space',
      '数据贴图（法线、金属度、Mask）被当成 sRGB 采样',
      '后处理 Tonemapping 和曝光没配对'
    ],
    steps: [
      'Player Settings → Color Space 设为 Linear。',
      '反照率 / 自发光：sRGB 勾选；法线、粗糙度、金属度：关闭 sRGB。',
      '灯光强度按物理单位理解，不要靠盲目加大一百分。',
      '用一张灰卡 / 标准球对照，再调 Tonemapper。'
    ]
  }
]
