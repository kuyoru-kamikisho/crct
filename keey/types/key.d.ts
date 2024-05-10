declare type KeyObject = {
    name: string
    keys: string[]
    description: string
}

declare type KeymapObject = {
    groupname: string
    keymaps: KeyObject[]
}

declare type KeymapObjectList = KeymapObject[]