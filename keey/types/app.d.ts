declare type AppSetting = {
    position: number[]
    size: number[]
}

declare type DepsObject = {
    keymaps: KeymapObjectList
    settings: AppSetting
}

declare type DepTypes = KeymapObjectList | AppSetting