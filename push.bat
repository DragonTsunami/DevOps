@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ========================================
echo       GitHub 上传脚本
echo ========================================
echo.

REM 检查参数
if "%~1"=="" (
    echo ❌ 错误: 请提供提交信息
    echo 用法: push.bat "提交信息"
    echo 示例: push.bat "feat: 添加新功能"
    pause
    exit /b 1
)

REM 运行 PowerShell 脚本
powershell -ExecutionPolicy Bypass -File "%~dp0github-push.ps1" -Message "%~1"

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ 上传失败
    pause
    exit /b 1
)

echo.
echo ✅ 上传成功！
pause