@echo off
chcp 65001 >nul
title SESFA - Gestao de Comunidade
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo  O Node.js nao foi encontrado. Instale em https://nodejs.org e rode este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo.
  echo  Instalando as dependencias pela primeira vez. Isso pode levar alguns minutos...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

echo.
echo  Abrindo o SESFA no navegador. Para encerrar, feche esta janela.
echo.
call npm run dev -- --open
