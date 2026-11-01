@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24 或更高版本，再运行本文件。
  pause
  exit /b 1
)
echo 拾光 FindBack：启动后请打开 http://127.0.0.1:5180
echo 按 Ctrl+C 停止服务。数据库会保存在 backend\data\findback.db。
node backend/server.mjs
pause
