@echo off
chcp 65001 >nul

REM ===============================
REM  INICIANDO AUXJURIS IA COMPLETO
REM ===============================

REM Caminho do Qdrant (ajuste se necessário)
set QDRANT_PATH="C:\Users\marce\Downloads\Udemy Download\Marllus Lustosa\qdrant-x86_64-pc-windows-msvc\qdrant.exe"

REM Verifica se a porta 6333 (Qdrant) está em uso
netstat -ano | findstr :6333 >nul
if %errorlevel%==0 (
    echo Porta 6333 já está em uso. Qdrant pode já estar rodando.
) else (
    REM 1. Iniciar Qdrant
    start "Qdrant" %QDRANT_PATH%
    echo Qdrant iniciado.
)

REM 2. Iniciar backend em nova janela
start "Backend" cmd /k "cd /d %~dp0 && npm --prefix backend run dev"
echo Backend iniciado.

REM 3. Iniciar frontend em nova janela
start "Frontend" cmd /k "cd /d %~dp0 && npm run dev:frontend"
echo Frontend iniciado.

echo ===============================
echo Todos os serviços foram iniciados!
echo Qdrant, backend e frontend estão rodando.
echo ===============================
pause
