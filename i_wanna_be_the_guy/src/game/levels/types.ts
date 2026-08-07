export type TileChar =
  | '.'
  | '#'
  | '^'
  | 'v'
  | '<'
  | '>'
  | 'P'
  | 'Q'
  | 'S'
  | 'G'
  | 'C'
  | 'E'
  | 'W'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '|'
  | '='

export interface LevelDef {
  id: number
  name: string
  hint: string
  danmaku: string[]
  map: string[]
}

export interface SpikeDef {
  x: number
  y: number
  dir: 'up' | 'down' | 'left' | 'right'
}

export interface PortalDef {
  x: number
  y: number
  id: number
  pairId: number
}

export interface EntitySpawn {
  x: number
  y: number
}

export interface PortalRuntime extends PortalDef {
  destX: number
  destY: number
}

export interface ParsedLevel {
  def: LevelDef
  solids: boolean[][]
  spikes: SpikeDef[]
  portals: PortalRuntime[]
  player: EntitySpawn
  ally?: EntitySpawn
  saves: EntitySpawn[]
  goal?: EntitySpawn
  collects: EntitySpawn[]
  enemies: EntitySpawn[]
  staffs: EntitySpawn[]
  pipes: EntitySpawn[]
  cols: number
  rows: number
}
