/**
 * 按出现顺序替换文案中的 `$rp` 占位符。
 * 未传入任何替换值时返回原文；占位符多于参数时，多余的 `$rp` 保持不变。
 *
 * @param {string} text
 * @param {...unknown} values
 * @returns {string}
 *
 * @example
 * replaceRp(t('character.summary'), 12, 8, 4)
 */
export function replaceRp(text, ...values) {
  if (!values.length) return text ?? ''
  let i = 0
  return String(text).replace(/\$rp/g, (token) =>
    i < values.length ? String(values[i++] ?? '') : token,
  )
}
