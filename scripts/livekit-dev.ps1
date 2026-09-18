<#
.SYNOPSIS
  Sobe o servidor LiveKit local para desenvolvimento — sem Docker.

.DESCRIPTION
  O LiveKit é um binário estático em Go: um executável, zero dependências.
  Este script baixa o binário na primeira execução e depois só o inicia.

  As chaves de API vêm da variável de ambiente LIVEKIT_KEYS. Se ela não
  estiver definida, usa um par de desenvolvimento que só vale nesta máquina.
  Em produção as chaves são geradas e passadas pelo ambiente — nunca commitadas.

.EXAMPLE
  npm run livekit
#>

$ErrorActionPreference = 'Stop'

$Version = '1.13.7'
$RepoRoot = Split-Path -Parent $PSScriptRoot
$ToolsDir = Join-Path $RepoRoot 'tools\livekit'
$Binary = Join-Path $ToolsDir 'livekit-server.exe'
$ConfigFile = Join-Path $RepoRoot 'config\livekit.dev.yaml'

# --- Baixa o binário se ainda não existe -----------------------------------
if (-not (Test-Path $Binary)) {
    Write-Host "Binário do LiveKit não encontrado. Baixando v$Version..." -ForegroundColor Yellow

    if (-not (Test-Path $ToolsDir)) {
        New-Item -ItemType Directory -Path $ToolsDir -Force | Out-Null
    }

    $Arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'amd64' }
    $Url = "https://github.com/livekit/livekit/releases/download/v$Version/livekit_${Version}_windows_$Arch.zip"
    $TempZip = Join-Path $env:TEMP "livekit_$Version.zip"

    Invoke-WebRequest -Uri $Url -OutFile $TempZip
    Expand-Archive -Path $TempZip -DestinationPath $ToolsDir -Force
    Remove-Item $TempZip -Force

    Write-Host "Binário instalado em $ToolsDir" -ForegroundColor Green
}

# --- Chaves de API ----------------------------------------------------------
if (-not $env:LIVEKIT_KEYS) {
    # Par de desenvolvimento: vale apenas para esta máquina, em rede local.
    $env:LIVEKIT_KEYS = 'devkey: devsecret_local_somente_desenvolvimento'
    Write-Host 'LIVEKIT_KEYS não definida — usando chave de desenvolvimento local.' -ForegroundColor DarkGray
}

# --- Mostra o endereço que o celular deve usar ------------------------------
$LanIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.InterfaceAlias -notmatch 'Loopback|Twingate|VPN|vEthernet'
    } |
    Select-Object -First 1 -ExpandProperty IPAddress)

Write-Host ''
Write-Host '  LiveKit (desenvolvimento local)' -ForegroundColor Cyan
Write-Host "  neste computador : ws://localhost:7880"
if ($LanIp) {
    Write-Host "  no celular       : ws://${LanIp}:7880" -ForegroundColor Green
    Write-Host '                     (celular precisa estar no mesmo Wi-Fi)' -ForegroundColor DarkGray
}
Write-Host ''

# O LiveKit anuncia aos clientes o IP por onde a mídia deve chegar. Sozinho ele
# pode escolher a interface errada (VPN, adaptador virtual), e aí o celular não
# alcança o servidor. Fixamos no IP da rede local.
if ($LanIp) {
    & $Binary --config $ConfigFile --node-ip $LanIp
} else {
    Write-Host 'Nenhum IP de rede local detectado; deixando o LiveKit escolher.' -ForegroundColor Yellow
    & $Binary --config $ConfigFile
}
