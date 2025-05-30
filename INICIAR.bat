@echo off
title Iniciando AuxJuris IA

echo ==================================================
echo  INICIANDO O AMBIENTE DE DESENVOLVIMENTO AUXJURIS IA
echo ==================================================
echo.

REM Navega para a pasta raiz do seu projeto
REM ATENCAO: Verifique se este caminho esta correto!
cd "C:\Users\marce\Downloads\Udemy Download\Marllus Lustosa\2auxjuris-ia (1)"

REM Verifica se o Node.js e npm estao acessiveis (opcional, para diagnostico)
echo Verificando versoes do Node.js e npm...
node -v
npm -v
echo.

REM Instala as dependencias do projeto (frontend e backend via postinstall)
echo Instalando/verificando dependencias do projeto...
echo Isso pode levar alguns minutos na primeira vez ou se houver muitas atualizações.
echo.
npm install
echo.

REM Executa o script de desenvolvimento que inicia frontend e backend
echo Iniciando servidores de frontend e backend...
echo Por favor, aguarde. Isso pode levar alguns instantes.
echo Os logs dos servidores aparecerão nesta janela.
echo.
npm run dev

REM O comando 'npm run dev' geralmente mantém a janela aberta.
REM Se ele fechar inesperadamente, descomente a linha abaixo para ver erros.
pause
