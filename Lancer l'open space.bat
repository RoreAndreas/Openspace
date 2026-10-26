@echo off
rem Double-clique sur ce fichier pour lancer l'open space sur ton ordinateur, avec ton compte Claude.
chcp 65001 >nul
cd /d "%~dp0"
title L'open space
echo.
echo   L'open space : verification de ton ordinateur...
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js n'est pas installe.
  echo       Installe la version LTS sur https://nodejs.org , puis double-clique a nouveau sur ce fichier.
  echo.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo   [OK] Node.js %%v
set "CLAUDE_OK="
where claude >nul 2>nul && set "CLAUDE_OK=1"
if exist "%USERPROFILE%\.local\bin\claude.exe" set "CLAUDE_OK=1"
if not defined CLAUDE_OK (
  echo   [X] Claude Code n'est pas installe.
  echo       Dans PowerShell, lance : irm https://claude.ai/install.ps1 ^| iex
  echo       puis tape : claude   ^(pour te connecter a ton compte Claude^), et relance ce fichier.
  echo.
  pause
  exit /b 1
)
echo   [OK] Claude Code trouve
echo.
if not exist node_modules (
  echo   Premiere fois : installation ^(1 a 2 minutes^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo   [X] L'installation a echoue. Verifie ta connexion internet, puis relance.
    pause
    exit /b 1
  )
)
echo   Lancement : le bureau va s'ouvrir dans ton navigateur ^(http://localhost:4848^).
echo   Pour l'arreter : ferme cette fenetre.
echo.
call npm start
pause
