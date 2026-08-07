import type {
  EntitySpawn,
  LevelDef,
  ParsedLevel,
  PortalRuntime,
  SpikeDef,
  TileChar,
} from './types'

export function parseLevel(def: LevelDef): ParsedLevel {
  const rows = def.map.length
  const cols = def.map[0].length
  const solids: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))
  const spikes: SpikeDef[] = []
  const saves: EntitySpawn[] = []
  const collects: EntitySpawn[] = []
  const enemies: EntitySpawn[] = []
  const staffs: EntitySpawn[] = []
  const pipes: EntitySpawn[] = []
  let player: EntitySpawn = { x: 2, y: 2 }
  let ally: EntitySpawn | undefined
  let goal: EntitySpawn | undefined
  const portalTemp: { x: number; y: number; id: number }[] = []

  for (let y = 0; y < rows; y++) {
    const line = def.map[y]
    for (let x = 0; x < cols; x++) {
      const c = (line[x] ?? '.') as TileChar
      switch (c) {
        case '#':
          solids[y][x] = true
          break
        case '^':
          spikes.push({ x, y, dir: 'up' })
          break
        case 'v':
          spikes.push({ x, y, dir: 'down' })
          break
        case '<':
          spikes.push({ x, y, dir: 'left' })
          break
        case '>':
          spikes.push({ x, y, dir: 'right' })
          break
        case 'P':
          player = { x, y }
          break
        case 'Q':
          ally = { x, y }
          break
        case 'S':
          saves.push({ x, y })
          break
        case 'G':
          goal = { x, y }
          break
        case 'C':
          collects.push({ x, y })
          break
        case 'E':
          enemies.push({ x, y })
          break
        case 'W':
          staffs.push({ x, y })
          break
        case '|':
          pipes.push({ x, y })
          break
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          portalTemp.push({ x, y, id: Number(c) })
          break
      }
    }
  }

  const byId = new Map<number, { x: number; y: number; id: number }[]>()
  for (const p of portalTemp) {
    const list = byId.get(p.id) ?? []
    list.push(p)
    byId.set(p.id, list)
  }

  const portals: PortalRuntime[] = []
  for (const [, list] of byId) {
    for (let i = 0; i < list.length; i++) {
      const cur = list[i]
      const dest = list[(i + 1) % list.length]
      portals.push({
        x: cur.x,
        y: cur.y,
        id: cur.id,
        pairId: dest.id,
        destX: dest.x,
        destY: dest.y,
      })
    }
  }

  return {
    def,
    solids,
    spikes,
    portals,
    player,
    ally,
    saves,
    goal,
    collects,
    enemies,
    staffs,
    pipes,
    cols,
    rows,
  }
}

export type { LevelDef, ParsedLevel, PortalRuntime }
