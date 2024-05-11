declare type KeyObject = {
    name: string
    keys: string[]
    description: string
}

declare type KeymapObject = {
    group: string
    keymaps: KeyObject[]
}

declare type KeymapObjectList = KeymapObject[]