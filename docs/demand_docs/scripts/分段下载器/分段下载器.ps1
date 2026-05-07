#Requires -Version 5.1
<#
  Segmented parallel download: HEAD for length / range support; merge via streams (binary-safe).
#>
param(
    [Parameter(Mandatory = $true)]
    [string] $Url,
    [string] $OutputFileName = $null,
    [int] $MaxSegments = 16
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

function Get-SafeFileNameFromUrl([Uri] $uri) {
    $leaf = [IO.Path]::GetFileName($uri.LocalPath)
    if ([string]::IsNullOrWhiteSpace($leaf) -or $leaf -eq '/' -or $leaf -eq '\') {
        return 'download.dat'
    }
    foreach ($c in [IO.Path]::GetInvalidFileNameChars()) {
        $leaf = $leaf.Replace($c, '_')
    }
    return $leaf
}

function Merge-PartFiles([string[]] $PartPathsInOrder, [string] $Destination) {
    $dir = [IO.Path]::GetDirectoryName($Destination)
    if (-not [string]::IsNullOrEmpty($dir) -and -not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $outStream = [IO.File]::Create($Destination)
    try {
        foreach ($p in $PartPathsInOrder) {
            $inStream = [IO.File]::OpenRead($p)
            try {
                $inStream.CopyTo($outStream)
            }
            finally {
                $inStream.Dispose()
            }
        }
    }
    finally {
        $outStream.Flush()
        $outStream.Dispose()
    }
}

function Download-Single([string] $u, [string] $dest) {
    Invoke-WebRequest -Uri $u -OutFile $dest -UseBasicParsing
}

function Download-ParallelRanges {
    param(
        [string] $u,
        [long] $totalBytes,
        [int] $segments,
        [string] $workDir,
        [string] $finalPath
    )

    $segCount = [int]$segments
    if ($totalBytes -lt $segCount) {
        $segCount = [Math]::Max(1, [int]$totalBytes)
    }
    $baseChunk = [long]([Math]::Floor($totalBytes / $segCount))
    $remainder = [long]($totalBytes % $segCount)

    $ranges = @()
    $offset = [long]0
    for ($i = 0; $i -lt $segCount; $i++) {
        $len = $baseChunk + ($(if ($i -lt $remainder) { 1 } else { 0 }))
        if ($len -le 0) { continue }
        $start = $offset
        $end = $offset + $len - 1
        $ranges += [pscustomobject]@{ Index = $i; Start = $start; End = $end; PartPath = (Join-Path $workDir ("part_{0:D4}.tmp" -f $i)) }
        $offset = $end + 1
    }

    $scriptBlock = {
        param($UriString, $Start, $End, $OutPath)
        $ErrorActionPreference = 'Stop'
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $req = [System.Net.HttpWebRequest]::Create($UriString)
        $req.Method = 'GET'
        $req.AddRange($Start, $End)
        $req.AllowReadStreamBuffering = $false
        $resp = $req.GetResponse()
        try {
            $rs = $resp.GetResponseStream()
            $fs = [IO.File]::Create($OutPath)
            try {
                $buf = New-Object byte[] (64KB)
                while (($n = $rs.Read($buf, 0, $buf.Length)) -gt 0) {
                    $fs.Write($buf, 0, $n)
                }
            }
            finally {
                $fs.Dispose()
                $rs.Dispose()
            }
        }
        finally {
            $resp.Dispose()
        }
    }

    $runspaces = @()
    $pool = [runspacefactory]::CreateRunspacePool(1, [Math]::Min(32, $ranges.Count))
    $pool.Open()
    try {
        foreach ($r in $ranges) {
            $ps = [powershell]::Create().AddScript($scriptBlock).
                AddArgument($u).AddArgument($r.Start).AddArgument($r.End).AddArgument($r.PartPath)
            $ps.RunspacePool = $pool
            $runspaces += [pscustomobject]@{ PowerShell = $ps; Handle = $ps.BeginInvoke() }
        }
        foreach ($item in $runspaces) {
            try {
                $item.PowerShell.EndInvoke($item.Handle)
            }
            catch {
                throw
            }
            finally {
                if ($item.PowerShell) { $item.PowerShell.Dispose() }
            }
        }
    }
    finally {
        $pool.Close()
        $pool.Dispose()
    }

    $orderedParts = $ranges | Sort-Object Index | ForEach-Object { $_.PartPath }
    foreach ($p in $orderedParts) {
        if (-not (Test-Path -LiteralPath $p)) {
            throw "Missing part file: $p"
        }
        $sz = (Get-Item -LiteralPath $p).Length
        $expected = ($ranges | Where-Object { $_.PartPath -eq $p } | Select-Object -First 1)
        $expLen = [long]($expected.End - $expected.Start + 1)
        if ($sz -ne $expLen) {
            throw "Part size mismatch: $p expected $expLen actual $sz"
        }
    }

    Merge-PartFiles -PartPathsInOrder $orderedParts -Destination $finalPath
    foreach ($p in $orderedParts) {
        Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
    }
}

$uri = [Uri]$Url
if (-not $uri.IsAbsoluteUri) {
    throw "Please use a full http(s) URL."
}

$outName = if ($OutputFileName) { $OutputFileName } else { Get-SafeFileNameFromUrl $uri }
$dest = Join-Path (Get-Location).Path $outName

Write-Host "Output: $dest"

try {
    $head = Invoke-WebRequest -Uri $Url -Method Head -UseBasicParsing
}
catch {
    Write-Host "HEAD failed; using single-connection download..."
    Download-Single -u $Url -dest $dest
    Write-Host "Done."
    exit 0
}

$contentLength = $null
if ($head.Headers['Content-Length']) {
    [void][long]::TryParse($head.Headers['Content-Length'], [ref]$contentLength)
}

$acceptRanges = $head.Headers['Accept-Ranges']
$canRange = $contentLength -and $contentLength -gt 0 -and
    ($acceptRanges -eq 'bytes' -or [string]::IsNullOrEmpty($acceptRanges))

# Below this size, parallel overhead usually wins
$minSizeForParallel = 2MB
if (-not $canRange -or $contentLength -lt $minSizeForParallel) {
    Write-Host "Single download (length: $contentLength, Accept-Ranges: $acceptRanges)..."
    Download-Single -u $Url -dest $dest
    Write-Host "Done."
    exit 0
}

$seg = [Math]::Min($MaxSegments, [int][Math]::Ceiling($contentLength / (512KB)))
$seg = [Math]::Max(2, $seg)
$workDir = Join-Path ([IO.Path]::GetTempPath()) ("segdl_" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $workDir -Force | Out-Null

Write-Host "Segments: $seg , total bytes: $contentLength"

try {
    Download-ParallelRanges -u $Url -totalBytes $contentLength -segments $seg -workDir $workDir -finalPath $dest
}
catch {
    Write-Host "Parallel download failed; retrying single connection: $_"
    if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force -ErrorAction SilentlyContinue }
    Download-Single -u $Url -dest $dest
}
finally {
    if (Test-Path -LiteralPath $workDir) {
        Remove-Item -LiteralPath $workDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

$finalLen = (Get-Item -LiteralPath $dest).Length
if ($contentLength -and $finalLen -ne $contentLength) {
    Write-Warning "Size mismatch vs Content-Length: local $finalLen , declared $contentLength"
}

Write-Host "Done. Size: $finalLen bytes"
