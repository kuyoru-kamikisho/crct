#Requires -Version 5.1
<#
.SYNOPSIS
  列出本机已安装的非系统自带软件名称及主程序路径。

.DESCRIPTION
  从卸载注册表读取已安装程序，过滤 Windows / 系统组件，
  并尽量解析主可执行文件路径，按如下格式输出：

  软件名    [D:\soft\app.exe]

.EXAMPLE
  .\getInstalledApps.ps1
#>

[CmdletBinding()]
param(
    # 同时排除 Microsoft 发布的应用（Office、Teams 等）
    [switch]$ExcludeMicrosoft
)

# 统一使用 UTF-8 输出，便于被 Python 等调用方按 utf-8 解码
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
if ($PSVersionTable.PSVersion.Major -ge 6) {
    $PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
    $PSDefaultParameterValues['*:Encoding'] = 'utf8'
}

$ErrorActionPreference = 'SilentlyContinue'

$UninstallRoots = @(
    'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
    'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    'HKCU:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*'
)

$SystemPathPrefixes = @(
    ($env:SystemRoot).ToLowerInvariant()
    'c:\windows'
    'c:\program files\windowsapps'
    'c:\program files\windows defender'
    'c:\program files\windows nt'
    'c:\program files\windows photo viewer'
    'c:\program files\windows sidebar'
    'c:\program files\windows media player'
    'c:\program files\internet explorer'
    'c:\program files (x86)\internet explorer'
    'c:\program files (x86)\windows media player'
    'c:\program files (x86)\windows nt'
) | Select-Object -Unique

function Test-UnderSystemPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { return $false }
    $p = $Path.ToLowerInvariant()
    foreach ($prefix in $SystemPathPrefixes) {
        if ($p.StartsWith($prefix)) { return $true }
    }
    return $false
}

function Test-WindowsComponent {
    param(
        [string]$Name,
        [string]$Publisher,
        [string]$InstallLocation
    )

    if ([string]::IsNullOrWhiteSpace($Name)) { return $true }

    $nameL = $Name.ToLowerInvariant().Trim()
    $pubL  = if ($Publisher) { $Publisher.ToLowerInvariant().Trim() } else { '' }

    # 名称像系统更新 / 运行库
    $namePatterns = @(
        '^microsoft\s+visual\s+c\+\+\s+\d{4}'
        '^microsoft\s+\.net'
        '^microsoft\s+edge'
        '^microsoft\s+update'
        '^windows\s+sdk'
        '^windows\s+software\s+development\s+kit'
        '^kb\d+'
        '^security\s+update'
        '^update\s+for\s+'
        '^hotfix\s+for\s+'
    )
    foreach ($pat in $namePatterns) {
        if ($nameL -match $pat) { return $true }
    }

    if ($pubL -match '^(microsoft(\s+corporation)?|microsoft\s+windows|windows\s+store)$') {
        # Microsoft 发布中保留常见用户应用
        if ($nameL -match 'office|visual studio|vscode|teams|onedrive|powerpoint|excel|word|outlook|skype|powertoys') {
            return $false
        }
        if ($nameL -match 'windows|defender|\.net|visual c\+\+|edge update|webview|directx|msi[e ]|runtime') {
            return $true
        }
    }

    if (Test-UnderSystemPath -Path $InstallLocation) { return $true }

    return $false
}

function Get-StrippedIconPath {
    param([string]$Raw)
    if ([string]::IsNullOrWhiteSpace($Raw)) { return $null }
    $p = $Raw.Trim().Trim('"')
    # DisplayIcon 常带 ",0" 图标索引
    if ($p -match '^(.+?),-?\d+$') {
        $p = $Matches[1].Trim().Trim('"')
    }
    return [Environment]::ExpandEnvironmentVariables($p)
}

function Get-ExeFromCommand {
    param([string]$Cmd)
    if ([string]::IsNullOrWhiteSpace($Cmd)) { return $null }
    $Cmd = $Cmd.Trim()
    if ($Cmd -match '^"([^"]+\.exe)"') { return $Matches[1] }
    if ($Cmd -match '^([^\s"]+\.exe)') { return $Matches[1] }
    return $null
}

function Test-UninstallerName {
    param([string]$Path)
    $name = [IO.Path]::GetFileName($Path)
    return ($name -match '(?i)(^|[^a-z])(uninst|uninstall|unins\d*|setup_uninstall)([^a-z]|$)')
}

function Resolve-MainExecutable {
    param(
        [string]$InstallLocation,
        [string]$DisplayIcon,
        [string]$UninstallString
    )

    $candidates = New-Object System.Collections.Generic.List[string]

    foreach ($raw in @(
        (Get-ExeFromCommand -Cmd $DisplayIcon)
        (Get-StrippedIconPath -Raw $DisplayIcon)
        (Get-ExeFromCommand -Cmd $UninstallString)
    )) {
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            $candidates.Add($raw) | Out-Null
        }
    }

    # 安装目录根下的 exe
    if ($InstallLocation -and (Test-Path -LiteralPath $InstallLocation -PathType Container)) {
        Get-ChildItem -LiteralPath $InstallLocation -Filter '*.exe' -File -ErrorAction SilentlyContinue |
            ForEach-Object { $candidates.Add($_.FullName) | Out-Null }

        # 浅层递归（最多 2 层）
        Get-ChildItem -LiteralPath $InstallLocation -Directory -ErrorAction SilentlyContinue |
            Where-Object {
                $_.Name -notin @(
                    'uninstall','uninst','update','updater','crashpad','locales',
                    'resources','drivers','redist','redistributable'
                )
            } |
            ForEach-Object {
                Get-ChildItem -LiteralPath $_.FullName -Filter '*.exe' -File -ErrorAction SilentlyContinue |
                    ForEach-Object { $candidates.Add($_.FullName) | Out-Null }
                Get-ChildItem -LiteralPath $_.FullName -Directory -ErrorAction SilentlyContinue |
                    ForEach-Object {
                        Get-ChildItem -LiteralPath $_.FullName -Filter '*.exe' -File -ErrorAction SilentlyContinue |
                            ForEach-Object { $candidates.Add($_.FullName) | Out-Null }
                    }
            }
    }

    $seen = @{}
    foreach ($c in $candidates) {
        try {
            $full = [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($c.Trim().Trim('"')))
        } catch {
            continue
        }
        if (-not $full.ToLowerInvariant().EndsWith('.exe')) { continue }
        if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
        if (Test-UnderSystemPath -Path $full) { continue }
        if (Test-UninstallerName -Path $full) { continue }

        $key = $full.ToLowerInvariant()
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true

        # 优先返回第一个有效主程序
        return $full
    }

    return $null
}

# ---------- 主流程 ----------
$apps = @()
$seenNames = @{}

Get-ItemProperty -Path $UninstallRoots -ErrorAction SilentlyContinue | ForEach-Object {
    $item = $_

    # 系统组件标记
    if ($null -ne $item.SystemComponent -and [int]$item.SystemComponent -eq 1) { return }

    $name = $item.DisplayName
    if ([string]::IsNullOrWhiteSpace($name)) { return }

    $publisher       = $item.Publisher
    $version         = $item.DisplayVersion
    $installLocation = $item.InstallLocation
    $uninstallString = $item.UninstallString
    $displayIcon     = $item.DisplayIcon

    if (Test-WindowsComponent -Name $name -Publisher $publisher -InstallLocation $installLocation) {
        return
    }

    if ($ExcludeMicrosoft -and $publisher -and ($publisher -match '(?i)microsoft')) {
        return
    }

    $dedupe = ("{0}|{1}" -f $name.ToLowerInvariant(), "$(if ($version) { $version.ToLowerInvariant() } else { '' })")
    if ($seenNames.ContainsKey($dedupe)) { return }
    $seenNames[$dedupe] = $true

    $exe = Resolve-MainExecutable `
        -InstallLocation $installLocation `
        -DisplayIcon $displayIcon `
        -UninstallString $uninstallString

    # 无路径时仍列出名称，路径留空括号外更清晰：按需求只输出有路径的
    if ([string]::IsNullOrWhiteSpace($exe)) { return }

    $apps += [pscustomobject]@{
        Name = $name
        Path = $exe
    }
}

$apps |
    Sort-Object Name |
    ForEach-Object {
        '{0}    [{1}]' -f $_.Name, $_.Path
    }
