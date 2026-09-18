<#
.SYNOPSIS
  Libera no firewall do Windows as portas do LiveKit de desenvolvimento.

.DESCRIPTION
  Precisa ser executado como ADMINISTRADOR. Roda uma vez só.

  Cria regras de entrada para o servidor LiveKit local, restritas ao perfil
  "Privado" (rede doméstica) e ao sub-rede local — o computador não fica
  exposto em Wi-Fi público nem para fora da sua rede.

  As regras cobrem quatro canais separados:
    TCP 3000        o app web (servidor de desenvolvimento do Vite)
    TCP 7880        sinalização do LiveKit (a conexão ws://)
    TCP 7881        reserva, para redes que bloqueiam UDP
    UDP 50000-50100 a mídia em si (o áudio)

  Liberar só a 7880 produz o sintoma clássico: conecta, a sala aparece
  com todos os participantes, e não sai áudio nenhum.

.EXAMPLE
  # Abra o PowerShell como Administrador e rode:
  .\scripts\firewall-dev.ps1

  # Para remover as regras depois:
  .\scripts\firewall-dev.ps1 -Remove
#>

param(
    [switch]$Remove
)

$ErrorActionPreference = 'Stop'

$IsAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Host ''
    Write-Host '  Este script precisa de privilegios de Administrador.' -ForegroundColor Red
    Write-Host '  Abra o PowerShell como Administrador e rode de novo.' -ForegroundColor Yellow
    Write-Host ''
    exit 1
}

$Rules = @(
    @{ Name = 'MotoRede web dev (TCP 3000)';              Protocol = 'TCP'; Port = '3000' },
    @{ Name = 'MotoRede LiveKit - sinalizacao (TCP 7880)'; Protocol = 'TCP'; Port = '7880' },
    @{ Name = 'MotoRede LiveKit - reserva TCP (7881)';     Protocol = 'TCP'; Port = '7881' },
    @{ Name = 'MotoRede LiveKit - midia (UDP 50000-50100)'; Protocol = 'UDP'; Port = '50000-50100' }
)

if ($Remove) {
    foreach ($Rule in $Rules) {
        $Existing = Get-NetFirewallRule -DisplayName $Rule.Name -ErrorAction SilentlyContinue
        if ($Existing) {
            Remove-NetFirewallRule -DisplayName $Rule.Name
            Write-Host "removida: $($Rule.Name)" -ForegroundColor DarkGray
        }
    }
    Write-Host ''
    Write-Host '  Regras removidas.' -ForegroundColor Green
    Write-Host ''
    exit 0
}

foreach ($Rule in $Rules) {
    $Existing = Get-NetFirewallRule -DisplayName $Rule.Name -ErrorAction SilentlyContinue
    if ($Existing) {
        Write-Host "ja existe: $($Rule.Name)" -ForegroundColor DarkGray
        continue
    }

    New-NetFirewallRule `
        -DisplayName $Rule.Name `
        -Direction Inbound `
        -Action Allow `
        -Protocol $Rule.Protocol `
        -LocalPort $Rule.Port `
        -Profile Private `
        -RemoteAddress LocalSubnet | Out-Null

    Write-Host "criada: $($Rule.Name)" -ForegroundColor Green
}

Write-Host ''
Write-Host '  Portas liberadas para a rede local (perfil Privado).' -ForegroundColor Cyan
Write-Host '  Teste no celular, no mesmo Wi-Fi, abrindo no navegador:' -ForegroundColor Cyan

$LanIp = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.InterfaceAlias -notmatch 'Loopback|Twingate|VPN|vEthernet'
    } |
    Select-Object -First 1 -ExpandProperty IPAddress)

if ($LanIp) {
    Write-Host "      http://${LanIp}:7880   (servidor de voz, deve mostrar: OK)" -ForegroundColor Green
    Write-Host "      http://${LanIp}:3000   (o app MotoRede)" -ForegroundColor Green
}
Write-Host ''
