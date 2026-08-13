# 构建单文件 dist\postwoman.exe
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
flutter build windows --release
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Set-Location "$PSScriptRoot\tool"
dart pub get
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
dart run bin\pack.dart --skip-build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
