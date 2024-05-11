declare type AppSetting = {
    enabledGroup: number
    opacity: number
    position: number[]
    size: number[]
}

declare type DepsObject = {
    keymaps: KeymapObjectList
    settings: AppSetting
}

declare type DepTypes = KeymapObjectList | AppSetting

declare type RegisteredWindowApi = {
    handleDeps: { (): Promise<DepsObject> }
}
