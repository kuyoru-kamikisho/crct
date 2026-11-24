#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# ========== 本机路径（可按环境修改）==========
$JavaHome  = "E:\jdk8"
$MavenHome = "E:\maven-3.6.1\apache-maven-3.6.1"
$MysqlHome = "E:\mysql-8.0.46"
$RedisHome = "E:\Redis-8.10.3-cygwin-with-Service"
$MysqlUser = "root"
$MysqlPassword = "?.spU?pfO9uf"
$DbName = "promilia"
$ServerDir = $PSScriptRoot

$env:JAVA_HOME = $JavaHome
$env:MAVEN_HOME = $MavenHome
$env:Path = "$JavaHome\bin;$MavenHome\bin;$MysqlHome\bin;" + $env:Path

$script:CleanupDone = $false

function Test-PortListening {
    param([int]$Port)
    $lines = netstat -ano 2>$null | Select-String -Pattern ":$Port\s" | Select-String "LISTENING"
    return $null -ne $lines
}

function Fail {
    param([string]$Message)
    Write-Host ""
    Write-Host "[错误] $Message" -ForegroundColor Red
    Write-Host "启动失败，请根据上方错误排查后重试。"
    throw "START_FAILED: $Message"
}

# 通过 cmd 调用 mysql 客户端，避免 stderr 警告在 $ErrorActionPreference=Stop 下中断脚本
function Invoke-MysqlCli {
    param(
        [Parameter(Mandatory = $true)][string]$Exe,
        [Parameter(Mandatory = $true)][string]$Arguments
    )
    $env:MYSQL_PWD = $MysqlPassword
    try {
        $cmd = "`"$Exe`" -u$MysqlUser $Arguments"
        cmd.exe /c $cmd | Out-Null
        return $LASTEXITCODE
    } finally {
        Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
    }
}

function Stop-Redis {
    $redisCli = Join-Path $RedisHome "redis-cli.exe"
    if (Test-Path $redisCli) {
        cmd.exe /c "`"$redisCli`" shutdown" | Out-Null
        Start-Sleep -Seconds 1
    }
    if (Test-PortListening -Port 6379) {
        Get-Process -Name "redis-server" -ErrorAction SilentlyContinue | Stop-Process -Force
    }
}

function Stop-Mysql {
    $mysqladmin = Join-Path $MysqlHome "bin\mysqladmin.exe"
    if (Test-Path $mysqladmin) {
        [void](Invoke-MysqlCli -Exe $mysqladmin -Arguments "shutdown")
        Start-Sleep -Seconds 2
    }
    if (Test-PortListening -Port 3306) {
        Get-Process -Name "mysqld" -ErrorAction SilentlyContinue | Stop-Process -Force
    }
}

function Invoke-ExitCleanup {
    if ($script:CleanupDone) { return }
    $script:CleanupDone = $true

    $redisUp = Test-PortListening -Port 6379
    $mysqlUp = Test-PortListening -Port 3306
    if (-not $redisUp -and -not $mysqlUp) {
        return
    }

    Write-Host ""
    Write-Host "当前状态: Redis=$(if ($redisUp) {'运行中'} else {'未运行'}), MySQL=$(if ($mysqlUp) {'运行中'} else {'未运行'})"
    try {
        $answer = Read-Host "是否关闭 MySQL 和 Redis？(Y/N)"
    } catch {
        $answer = "N"
    }

    if ($answer -notmatch '^[Yy]') {
        Write-Host "已保留 MySQL / Redis 继续运行。"
        return
    }

    if ($redisUp) {
        Write-Host "正在关闭 Redis ..."
        Stop-Redis
        if (Test-PortListening -Port 6379) {
            Write-Host "  Redis 未能完全关闭，请手动结束 redis-server 进程。" -ForegroundColor Yellow
        } else {
            Write-Host "  Redis 已关闭。"
        }
    }

    if ($mysqlUp) {
        Write-Host "正在关闭 MySQL ..."
        Stop-Mysql
        if (Test-PortListening -Port 3306) {
            Write-Host "  MySQL 未能完全关闭，请手动结束 mysqld 进程。" -ForegroundColor Yellow
        } else {
            Write-Host "  MySQL 已关闭。"
        }
    }
}

try {
    Write-Host "========================================"
    Write-Host " Promilia Server 一键启动"
    Write-Host "========================================"
    Write-Host ""

    if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
        Fail "未找到 java，请检查 JAVA_HOME=$JavaHome"
    }
    if (-not (Get-Command mvn -ErrorAction SilentlyContinue)) {
        Fail "未找到 mvn，请检查 MAVEN_HOME=$MavenHome"
    }

    # ---------- Redis ----------
    Write-Host "[1/4] 检查 Redis 6379 ..."
    if (Test-PortListening -Port 6379) {
        Write-Host "      Redis 已在运行"
    } else {
        Write-Host "      未运行，正在启动 Redis ..."
        $redisExe = Join-Path $RedisHome "redis-server.exe"
        if (-not (Test-Path $redisExe)) {
            Fail "未找到 Redis：$redisExe"
        }
        Start-Process -FilePath $redisExe -ArgumentList "redis.conf" `
            -WorkingDirectory $RedisHome -WindowStyle Minimized | Out-Null
        Start-Sleep -Seconds 2
    }

    # ---------- MySQL ----------
    Write-Host "[2/4] 检查 MySQL 3306 ..."
    if (Test-PortListening -Port 3306) {
        Write-Host "      MySQL 已在运行"
    } else {
        Write-Host "      未运行，正在启动 MySQL ..."
        $mysqld = Join-Path $MysqlHome "bin\mysqld.exe"
        $myIni = Join-Path $MysqlHome "my.ini"
        if (-not (Test-Path $mysqld)) {
            Fail "未找到 MySQL：$mysqld"
        }
        Start-Process -FilePath $mysqld -ArgumentList "--defaults-file=`"$myIni`"" `
            -WindowStyle Minimized | Out-Null
        Write-Host "      等待 MySQL 就绪 ..."
        $mysqladmin = Join-Path $MysqlHome "bin\mysqladmin.exe"
        $ready = $false
        for ($i = 0; $i -lt 30; $i++) {
            Start-Sleep -Seconds 2
            if ((Invoke-MysqlCli -Exe $mysqladmin -Arguments "ping") -eq 0) {
                $ready = $true
                break
            }
        }
        if (-not $ready) {
            Fail "MySQL 启动超时，请检查 my.ini / 错误日志"
        }
        Write-Host "      MySQL 已就绪"
    }

    # ---------- 创建库 ----------
    Write-Host "[3/4] 确保数据库 $DbName 存在 ..."
    $mysql = Join-Path $MysqlHome "bin\mysql.exe"
    $sql = "CREATE DATABASE IF NOT EXISTS ``$DbName`` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"
    $createExit = Invoke-MysqlCli -Exe $mysql -Arguments "-e `"$sql`""
    if ($createExit -ne 0) {
        Fail "创建数据库失败，请检查账号密码"
    }
    Write-Host "      表结构将由应用启动时自动执行 schema.sql"

    # ---------- Spring Boot ----------
    Write-Host "[4/4] 启动 Spring Boot（端口 8080）..."
    Write-Host "      工作目录: $ServerDir"
    Write-Host "      退出时（含 Ctrl+C）会询问是否关闭 MySQL / Redis"
    Write-Host ""
    Set-Location $ServerDir
    & mvn -DskipTests spring-boot:run
} catch {
    if ($_.Exception.Message -notlike "START_FAILED:*") {
        Write-Host ""
        Write-Host "[异常] $($_.Exception.Message)" -ForegroundColor Red
    }
} finally {
    Invoke-ExitCleanup
}
