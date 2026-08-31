export function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v))
}

export function len2(x, y) {
  return Math.hypot(x, y)
}

export function len3(x, y, z) {
  return Math.hypot(x, y, z)
}

export function norm2(x, y) {
  const l = len2(x, y) || 1
  return [x / l, y / l]
}

export function norm3(x, y, z) {
  const l = len3(x, y, z) || 1
  return [x / l, y / l, z / l]
}

export function dot2(ax, ay, bx, by) {
  return ax * bx + ay * by
}

export function dot3(ax, ay, az, bx, by, bz) {
  return ax * bx + ay * by + az * bz
}

export function cross2(ax, ay, bx, by) {
  return ax * by - ay * bx
}

export function cross3(ax, ay, az, bx, by, bz) {
  return [ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx]
}

export function angleBetween(ax, ay, bx, by) {
  const la = len2(ax, ay)
  const lb = len2(bx, by)
  if (!la || !lb) return 0
  return Math.acos(clamp(dot2(ax, ay, bx, by) / (la * lb), -1, 1))
}

export function fmt(n, d = 2) {
  if (!Number.isFinite(n)) return '—'
  const v = Number(n.toFixed(d))
  return Object.is(v, -0) ? '0.00'.slice(0, d ? d + 2 : 1) : v.toFixed(d)
}

export function deg(rad) {
  return (rad * 180) / Math.PI
}

export function rad(degVal) {
  return (degVal * Math.PI) / 180
}
