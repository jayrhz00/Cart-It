<#
.SYNOPSIS
  Resizes screenshots to Chrome Web Store dimensions (1280x800 or 640x400), letterboxed on white, saves as JPEG.

.EXAMPLE
  .\scripts\resize-chrome-store-screenshots.ps1 -InputPaths @("$env:USERPROFILE\Desktop\shot1.png")
.EXAMPLE
  .\scripts\resize-chrome-store-screenshots.ps1 -InputFolder "$env:USERPROFILE\Desktop\store-shots"
#>
param(
  [string[]]$InputPaths = @(),
  [string]$InputFolder = "",
  [string]$OutputFolder = "",
  [ValidateSet(1280, 640)]
  [int]$Width = 1280,
  [ValidateSet(800, 400)]
  [int]$Height = 800,
  [int]$JpegQuality = 92
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if ($Width -eq 1280 -and $Height -ne 800) { throw "Use 1280 with 800, or 640 with 400." }
if ($Width -eq 640 -and $Height -ne 400) { throw "Use 640 with 400, or 1280 with 800." }

if (-not $OutputFolder) {
  $OutputFolder = Join-Path $PSScriptRoot "..\chrome-store-screenshots-out"
}
$OutputFolder = (Resolve-Path -LiteralPath (New-Item -ItemType Directory -Force -Path $OutputFolder)).Path

$files = [System.Collections.Generic.List[string]]::new()
foreach ($p in $InputPaths) { if ($p) { $files.Add((Resolve-Path -LiteralPath $p).Path) } }
if ($InputFolder) {
  $folder = (Resolve-Path -LiteralPath $InputFolder).Path
  Get-ChildItem -Path $folder -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '^\.(png|jpg|jpeg)$' } |
    ForEach-Object { $files.Add($_.FullName) }
}

if ($files.Count -eq 0) {
  Write-Host "No images. Usage:"
  Write-Host "  -InputPaths @('C:\path\a.png','C:\path\b.png')"
  Write-Host "  -InputFolder 'C:\folder\with\screenshots'"
  exit 1
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encQuality = [System.Drawing.Imaging.Encoder]::Quality
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ($encQuality, [long]$JpegQuality)

$i = 0
foreach ($srcPath in $files) {
  $i++
  $src = $null
  $bmp = $null
  $g = $null
  try {
    $src = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $sw = [double]$src.Width
    $sh = [double]$src.Height
    $scale = [Math]::Min($Width / $sw, $Height / $sh)
    $nw = [int][Math]::Floor($sw * $scale)
    $nh = [int][Math]::Floor($sh * $scale)
    $x = [int][Math]::Floor(($Width - $nw) / 2)
    $y = [int][Math]::Floor(($Height - $nh) / 2)
    $g.DrawImage($src, $x, $y, $nw, $nh)
    $base = [System.IO.Path]::GetFileNameWithoutExtension($srcPath)
    $outPath = Join-Path $OutputFolder ("{0:D2}-{1}-{2}x{3}.jpg" -f $i, $base, $Width, $Height)
    $bmp.Save($outPath, $jpegCodec, $ep)
    Write-Host "OK $outPath"
  }
  finally {
    if ($g) { $g.Dispose() }
    if ($bmp) { $bmp.Dispose() }
    if ($src) { $src.Dispose() }
  }
}

Write-Host ""
Write-Host "Done. Upload these JPEGs to Chrome Web Store (max 5). Output: $OutputFolder"
