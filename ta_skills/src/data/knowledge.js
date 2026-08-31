export const chapters = [
  { id: 'math', title: '01 数学基础', icon: 'mdi-axis-arrow' },
  { id: 'gfx', title: '02 图形学基础', icon: 'mdi-cube-outline' },
  { id: 'shading', title: '03 光照与着色', icon: 'mdi-lightbulb-on-outline' },
  { id: 'practice', title: '04 引擎实践', icon: 'mdi-unity' }
]

export const articles = [
  {
    slug: 'coords',
    chapter: 'math',
    title: '坐标系：世界从原点开始',
    summary: '笛卡尔坐标系、左手/右手、局部与世界空间。拖动点看坐标如何变化。',
    keywords: ['坐标系', '原点', '轴', '左手系', '右手系', '世界空间', '局部空间'],
    component: () => import('../articles/Coords.vue')
  },
  {
    slug: 'vectors',
    chapter: 'math',
    title: '从 1+1 到向量',
    summary: '标量加法如何变成向量加法。方向、长度、单位向量。',
    keywords: ['向量', '标量', '加法', '单位向量', '归一化', '1+1'],
    component: () => import('../articles/Vectors.vue')
  },
  {
    slug: 'dot-product',
    chapter: 'math',
    title: '点乘：夹角、投影与“有多同向”',
    summary: '点乘是 TA 里出现频率最高的运算之一，用来算夹角、投影和光照。',
    keywords: ['点乘', '点积', 'dot', '夹角', '投影', 'cos'],
    component: () => import('../articles/DotProduct.vue')
  },
  {
    slug: 'cross-product',
    chapter: 'math',
    title: '叉乘：垂直方向与面积',
    summary: '叉乘给出垂直于两个向量的方向，用来做法线、判断绕向。',
    keywords: ['叉乘', '叉积', 'cross', '法线', '右手定则'],
    component: () => import('../articles/CrossProduct.vue')
  },
  {
    slug: 'matrix',
    chapter: 'math',
    title: '矩阵与 2D 变换',
    summary: '平移、旋转、缩放如何写成矩阵，以及为什么要按特定顺序相乘。',
    keywords: ['矩阵', '变换', '平移', '旋转', '缩放', 'TRS'],
    component: () => import('../articles/Matrix.vue')
  },
  {
    slug: 'transform-3d',
    chapter: 'math',
    title: '3D 变换与齐次坐标',
    summary: '4×4 矩阵、齐次坐标，以及为什么平移必须用 4 维。',
    keywords: ['齐次坐标', '4x4', 'MVP', '模型矩阵', '四元数'],
    component: () => import('../articles/Transform3D.vue')
  },
  {
    slug: 'pipeline',
    chapter: 'gfx',
    title: '渲染管线一览',
    summary: '从 CPU 提交到 GPU 画出像素：顶点、光栅化、片元、测试与混合。',
    keywords: ['渲染管线', 'GPU', '顶点', '光栅化', '片元', 'draw call'],
    component: () => import('../articles/Pipeline.vue')
  },
  {
    slug: 'camera',
    chapter: 'gfx',
    title: '相机与投影',
    summary: '透视为什么近大远小，FOV 和近远裁剪面如何影响画面。',
    keywords: ['相机', '透视', '正交', 'FOV', '投影矩阵', '裁剪面'],
    component: () => import('../articles/Camera.vue')
  },
  {
    slug: 'color',
    chapter: 'gfx',
    title: '颜色、Gamma 与线性空间',
    summary: '显示器不是线性的。搞清 sRGB 和线性空间，光照才不会发灰。',
    keywords: ['颜色', 'gamma', 'sRGB', '线性空间', 'HDR'],
    component: () => import('../articles/Color.vue')
  },
  {
    slug: 'texture',
    chapter: 'shading',
    title: 'UV、纹理采样与法线贴图',
    summary: 'UV 如何把 2D 图贴到 3D 表面上，法线贴图为什么能“假挤出”细节。',
    keywords: ['UV', '纹理', '采样', 'mipmap', '法线贴图', '切线空间'],
    component: () => import('../articles/Texture.vue')
  },
  {
    slug: 'lighting',
    chapter: 'shading',
    title: 'Lambert 与 Phong 光照',
    summary: '漫反射、高光、环境光：经典实时光照模型，几乎所有面试都会问。',
    keywords: ['Lambert', 'Phong', 'Blinn', '漫反射', '高光', 'NdotL'],
    component: () => import('../articles/Lighting.vue')
  },
  {
    slug: 'pbr',
    chapter: 'shading',
    title: 'PBR 直觉：金属、粗糙度、能量守恒',
    summary: '不堆公式，先建立“金属度 / 粗糙度 / 反照率”这三个旋钮的直觉。',
    keywords: ['PBR', '金属度', '粗糙度', 'BRDF', 'Fresnel', '反照率'],
    component: () => import('../articles/PBR.vue')
  },
  {
    slug: 'shader',
    chapter: 'shading',
    title: 'Shader 是什么：顶点与片元',
    summary: '着色器就是跑在 GPU 上的小程序。在线改一段片元代码看立刻出图。',
    keywords: ['Shader', 'GLSL', 'HLSL', '顶点着色器', '片元着色器', 'varying'],
    component: () => import('../articles/Shader.vue')
  },
  {
    slug: 'unity-shader',
    chapter: 'practice',
    title: '实践：用 Unity 写第一个 Shader',
    summary: '从新建材质到看到颜色，按步做完你就迈过了 TA 的第一道门槛。',
    keywords: ['Unity', 'ShaderLab', '材质', '实践', 'URP'],
    component: () => import('../articles/UnityPractice.vue')
  }
]

export function articlesOf(chapterId) {
  return articles.filter((a) => a.chapter === chapterId)
}

export function findArticle(slug) {
  return articles.find((a) => a.slug === slug)
}

export function neighbors(slug) {
  const i = articles.findIndex((a) => a.slug === slug)
  return {
    prev: i > 0 ? articles[i - 1] : null,
    next: i >= 0 && i < articles.length - 1 ? articles[i + 1] : null
  }
}
