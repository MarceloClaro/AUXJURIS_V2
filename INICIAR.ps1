# Script PowerShell para iniciar Qdrant, backend e frontend do AUXJURIS_V2

# Caminho do Qdrant (ajuste se necessário)
$QDRANT_PATH = "C:\Users\marce\Downloads\Udemy Download\Marllus Lustosa\qdrant-x86_64-pc-windows-msvc\qdrant.exe"

# Verifica se a porta 6333 está em uso
$portInUse = $null -ne (Get-NetTCPConnection -LocalPort 6333 -ErrorAction SilentlyContinue)
if ($portInUse) {
    Write-Host "Porta 6333 já está em uso. Qdrant pode já estar rodando."
} else {
    Start-Process -WindowStyle Normal -FilePath $QDRANT_PATH -ArgumentList ""
    Write-Host "Qdrant iniciado."
}

# Iniciar backend em nova janela
Start-Process -WindowStyle Normal -FilePath "cmd.exe" -ArgumentList "/k cd /d $PSScriptRoot && npm --prefix backend run dev"
Write-Host "Backend iniciado."

# Iniciar frontend em nova janela
Start-Process -WindowStyle Normal -FilePath "cmd.exe" -ArgumentList "/k cd /d $PSScriptRoot && npm run dev:frontend"
Write-Host "Frontend iniciado."

Write-Host "==============================="
Write-Host "Todos os serviços foram iniciados!"
Write-Host "Qdrant, backend e frontend estão rodando."
Write-Host "==============================="
Pause
