@echo off
setlocal

REM ===== Fixed paths from requirement =====
set "MAVEN_HOME=E:\maven-3.6.1\apache-maven-3.6.1"
set "JAVA_HOME=E:\jdk8"
set "PROJECT_DIR=D:\code\crct\source\backend"

REM ===== Basic validation =====
if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  echo [ERROR] Maven not found: %MAVEN_HOME%\bin\mvn.cmd
  pause
  exit /b 1
)

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo [ERROR] JDK not found: %JAVA_HOME%\bin\java.exe
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%\pom.xml" (
  echo [ERROR] Maven project not found: %PROJECT_DIR%\pom.xml
  pause
  exit /b 1
)

REM ===== Runtime environment =====
set "PATH=%JAVA_HOME%\bin;%MAVEN_HOME%\bin;%PATH%"

echo.
echo [INFO] JAVA_HOME=%JAVA_HOME%
echo [INFO] MAVEN_HOME=%MAVEN_HOME%
echo [INFO] PROJECT_DIR=%PROJECT_DIR%
echo [INFO] Debug port: 5005
echo.

cd /d "%PROJECT_DIR%"

REM JDWP debug enabled: JDK8 uses "address=5005" (not "*:5005")
call mvn -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005" spring-boot:run

set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo [ERROR] Service exited with code %EXIT_CODE%.
) else (
  echo [INFO] Service exited normally.
)
pause
exit /b %EXIT_CODE%
