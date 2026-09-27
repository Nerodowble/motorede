<#
===============================================================================
 GERAR MARCA - todos os ícones e logos do MotoRede a partir de UMA imagem
===============================================================================
 Fonte: docs/marca/motorede-logo.png (1254x1254, quadrado preto arredondado
 com cantos transparentes). Trocou a logo? Substitua esse arquivo e rode:

     powershell -ExecutionPolicy Bypass -File scripts\gerar-marca.ps1

 Cada plataforma tem uma regra, e é por isso que não dá para usar a mesma
 imagem em todo lugar:
   - iPhone / ícone do app: quadrado SEM transparência (o sistema arredonda).
   - Android adaptativo: o desenho tem de caber no círculo central (66%),
     porque cada fabricante recorta num formato; o fundo vai separado.
   - Android monocromático (ícones temáticos): silhueta branca.
   - PWA "maskable": fundo cheio e desenho na zona segura.
   - Favicon: 16-32 px não lê "MOTO REDE"; vai só o pino com o capacete.

 As regiões abaixo foram medidas na imagem original. Logo nova com outro
 enquadramento? Meça de novo (quadrado, conteúdo e pino).
===============================================================================
#>

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$raiz = Split-Path -Parent $PSScriptRoot
$fonte = [System.Drawing.Bitmap]::FromFile((Join-Path $raiz 'docs\marca\motorede-logo.png'))

# Regiões da imagem original (px)
$quadrado = New-Object System.Drawing.Rectangle 52, 58, 1147, 1135   # o quadrado preto
$conteudo = New-Object System.Drawing.Rectangle 210, 164, 835, 829   # pino + texto
$pino     = New-Object System.Drawing.Rectangle 332, 135, 580, 580   # pino + anel, quadrado

$preto = [System.Drawing.Color]::FromArgb(255, 0, 0, 0)

function Novo([int]$lado) {
  $bmp = New-Object System.Drawing.Bitmap $lado, $lado, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.CompositingQuality = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  return @($bmp, $g)
}

function Salvar($bmp, $g, [string]$caminho) {
  $g.Dispose()
  $destino = Join-Path $raiz $caminho
  New-Item -ItemType Directory -Force (Split-Path $destino) | Out-Null
  $bmp.Save($destino, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "  $caminho"
}

# Desenha a região $origem da logo dentro de um quadrado $lado, ocupando $escala do lado.
function Desenhar($g, [int]$lado, $origem, [double]$escala) {
  $maior = [Math]::Max($origem.Width, $origem.Height)
  $fator = ($lado * $escala) / $maior
  $w = $origem.Width * $fator; $h = $origem.Height * $fator
  $dest = New-Object System.Drawing.RectangleF (($lado - $w) / 2), (($lado - $h) / 2), $w, $h
  $g.DrawImage($fonte, $dest, $origem, [System.Drawing.GraphicsUnit]::Pixel)
}

# Retângulo arredondado preto (para ícones pequenos com o pino).
function FundoArredondado($g, [int]$lado) {
  $r = [int]($lado * 0.22); $d = $r * 2; $m = $lado - 1
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc(0, 0, $d, $d, 180, 90); $p.AddArc($m - $d, 0, $d, $d, 270, 90)
  $p.AddArc($m - $d, $m - $d, $d, $d, 0, 90); $p.AddArc(0, $m - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  $g.FillPath((New-Object System.Drawing.SolidBrush $preto), $p)
}

# Silhueta branca: tudo que é desenho claro (vermelho ou branco) vira branco.
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public static class Silhueta {
  public static Bitmap Branca(Bitmap origem) {
    var r = new Rectangle(0, 0, origem.Width, origem.Height);
    var saida = new Bitmap(origem.Width, origem.Height, PixelFormat.Format32bppArgb);
    var a = origem.LockBits(r, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
    var b = saida.LockBits(r, ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
    int n = a.Stride * origem.Height; var px = new byte[n]; Marshal.Copy(a.Scan0, px, 0, n);
    for (int i = 0; i < n; i += 4) {
      int cor = px[i] + px[i + 1] + px[i + 2];          // B + G + R
      bool desenho = px[i + 3] > 128 && (px[i + 2] > 120 || cor > 300);
      px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = (byte)(desenho ? 255 : 0);
    }
    Marshal.Copy(px, 0, b.Scan0, n); origem.UnlockBits(a); saida.UnlockBits(b); return saida;
  }
}
'@

Write-Host 'Web (apps/web/public):' -ForegroundColor Cyan
foreach ($lado in 192, 512) {
  $bmp, $g = Novo $lado; Desenhar $g $lado $quadrado 1.0
  Salvar $bmp $g "apps\web\public\pwa-${lado}x${lado}.png"
}
$bmp, $g = Novo 512; $g.Clear($preto); Desenhar $g 512 $conteudo 0.62
Salvar $bmp $g 'apps\web\public\pwa-maskable-512x512.png'
$bmp, $g = Novo 180; $g.Clear($preto); Desenhar $g 180 $quadrado 1.0
Salvar $bmp $g 'apps\web\public\apple-touch-icon.png'
foreach ($lado in 32, 64) {
  $bmp, $g = Novo $lado; FundoArredondado $g $lado; Desenhar $g $lado $pino 0.9
  Salvar $bmp $g "apps\web\public\favicon-$lado.png"
}
$bmp, $g = Novo 256; FundoArredondado $g 256; Desenhar $g 256 $pino 0.9
Salvar $bmp $g 'apps\web\public\marca-pino.png'            # topo da web
$bmp, $g = Novo 512; Desenhar $g 512 $quadrado 1.0
Salvar $bmp $g 'apps\web\public\marca-logo.png'            # tela de login

Write-Host 'App (apps/mobile/assets):' -ForegroundColor Cyan
$bmp, $g = Novo 1024; $g.Clear($preto); Desenhar $g 1024 $quadrado 1.0
Salvar $bmp $g 'apps\mobile\assets\icon.png'
# Adaptativo: o conteúdo cabe num círculo de 66% (a diagonal do conteúdo
# ocupa ~0,85 do lado dele, daí 0,66 / 0,85 / 1,41 ≈ 0,55).
$bmp, $g = Novo 1024; Desenhar $g 1024 $conteudo 0.55
$fg = $bmp.Clone(); Salvar $bmp $g 'apps\mobile\assets\android-icon-foreground.png'
$mono = [Silhueta]::Branca($fg); $fg.Dispose()
$mono.Save((Join-Path $raiz 'apps\mobile\assets\android-icon-monochrome.png'), [System.Drawing.Imaging.ImageFormat]::Png); $mono.Dispose()
Write-Host '  apps\mobile\assets\android-icon-monochrome.png'
$bmp, $g = Novo 1024; $g.Clear($preto)
Salvar $bmp $g 'apps\mobile\assets\android-icon-background.png'
$bmp, $g = Novo 1024; Desenhar $g 1024 $quadrado 1.0
Salvar $bmp $g 'apps\mobile\assets\splash-icon.png'
$bmp, $g = Novo 48; FundoArredondado $g 48; Desenhar $g 48 $pino 0.9
Salvar $bmp $g 'apps\mobile\assets\favicon.png'
$bmp, $g = Novo 256; FundoArredondado $g 256; Desenhar $g 256 $pino 0.9
Salvar $bmp $g 'apps\mobile\assets\marca-pino.png'         # topo do app

$fonte.Dispose()
Write-Host 'Pronto.' -ForegroundColor Green
