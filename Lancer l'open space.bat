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
if defined CLAUDE_OK (
  echo   [OK] Claude Code trouve : le levier du bureau sur orange = ton compte Claude
) else (
  echo   [!] Claude Code n'est pas installe : l'equipe travaillera avec l'IA gratuite.
  echo       Pour ton compte Claude, dans PowerShell : irm https://claude.ai/install.ps1 ^| iex
)
set "OLLAMA_OK="
where ollama >nul 2>nul && set "OLLAMA_OK=1"
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" set "OLLAMA_OK=1"
if defined OLLAMA_OK (
  echo   [OK] Ollama trouve : le levier du bureau sur vert = l'IA gratuite, sur ton PC
) else (
  echo   [!] Ollama n'est pas installe : pour l'IA gratuite, installe-le sur https://ollama.com
  echo       ^(sans droits d'administrateur^), puis : ollama pull qwen3:4b
)
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
