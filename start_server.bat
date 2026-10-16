@echo off
chcp 65001 >nul
title Audio Panel v0.2.0.0 - 應援音控面板伺服器
echo ========================================================
echo   應援音控面板 (Audio Panel v0.2.0.0)
echo   支援區網 Android 手機連線與 PWA 主畫面安裝
echo ========================================================
npm.cmd run dev -- --host 0.0.0.0 --port 5173
pause
