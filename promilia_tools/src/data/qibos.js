/**
 * 奇波图鉴辅助函数。全量列表走 /api/qibos，详情走 /api/qibos/:id。
 */

export function getQiboById(list, id) {
  return list?.find((item) => item.id === id) || null
}
