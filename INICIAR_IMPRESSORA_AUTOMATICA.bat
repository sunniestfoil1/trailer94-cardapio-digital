@echo off
title Bulls Burger - Spooler de Impressao Automatica Termica
color 0A
echo ========================================================
echo   BULLS BURGER - AGENTE DE IMPRESSAO AUTOMATICA
echo ========================================================
echo Conectando ao banco de dados Supabase e monitorando pedidos...
echo.
cd /d "%~dp0server"
node --env-file=.env scripts/spooler-impressao.js
pause
