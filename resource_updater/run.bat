@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  python "%~dp0analyzer.py" %*
  exit /b %ERRORLEVEL%
)
where python3 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
  python3 "%~dp0analyzer.py" %*
  exit /b %ERRORLEVEL%
)
if exist "D:\Apps\python3\python.exe" (
  "D:\Apps\python3\python.exe" "%~dp0analyzer.py" %*
  exit /b %ERRORLEVEL%
)
echo [错误] 未找到 Python，请先安装并加入 PATH。
exit /b 1
