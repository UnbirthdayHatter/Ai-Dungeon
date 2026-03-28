$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$themePath = Join-Path $root 'public\assets\themes\tester1'
$defaultThemePath = Join-Path $root 'public\assets\themes\default'
$tempPath = Join-Path $themePath '_magick_tmp'

if (-not (Test-Path $themePath)) {
  New-Item -ItemType Directory -Path $themePath | Out-Null
}

if (Test-Path $tempPath) {
  Remove-Item -Recurse -Force $tempPath
}
New-Item -ItemType Directory -Path $tempPath | Out-Null

$size = 1024
$random = [System.Random]::new(1337)

$points = New-Object System.Collections.Generic.List[string]
for ($row = 0; $row -lt 8; $row++) {
  for ($col = 0; $col -lt 7; $col++) {
    $baseX = [int](($col + 0.5) * ($size / 7.0))
    $baseY = [int](($row + 0.5) * ($size / 8.0))
    $x = [Math]::Max(0, [Math]::Min($size - 1, $baseX + $random.Next(-42, 43)))
    $y = [Math]::Max(0, [Math]::Min($size - 1, $baseY + $random.Next(-34, 35)))
    $gray = $random.Next(96, 196)
    $points.Add("$x,$y rgb($gray,$gray,$gray)")
  }
}

$pointSpec = [string]::Join(' ', $points)

$base = Join-Path $tempPath 'base.png'
$seams = Join-Path $tempPath 'seams.png'
$stoneNoise = Join-Path $tempPath 'stone-noise.png'
$shading = Join-Path $tempPath 'shading.png'
$cracks = Join-Path $tempPath 'cracks.png'
$embers = Join-Path $tempPath 'embers.png'
$numberGlowLight = Join-Path $tempPath 'number-glow-light.png'
$numberGlowDark = Join-Path $tempPath 'number-glow-dark.png'
$emissiveLight = Join-Path $themePath 'emissive-light.png'
$emissiveDark = Join-Path $themePath 'emissive-dark.png'
$preparedLight = Join-Path $tempPath 'prepared-light.png'
$preparedDark = Join-Path $tempPath 'prepared-dark.png'
$lightOut = Join-Path $themePath 'diffuse-light.png'
$darkOut = Join-Path $themePath 'diffuse-dark.png'
$defaultLight = Join-Path $defaultThemePath 'diffuse-light.png'
$defaultDark = Join-Path $defaultThemePath 'diffuse-dark.png'

foreach ($file in @('default.json', 'normal.png', 'specular.jpg')) {
  Copy-Item (Join-Path $defaultThemePath $file) (Join-Path $themePath $file) -Force
}

magick -size ${size}x${size} xc:"#120805" `
  -sparse-color Voronoi $pointSpec `
  -colorspace sRGB `
  -blur 0x1.4 `
  $base

magick $base `
  -colorspace gray `
  -edge 2 `
  -blur 0x1.2 `
  -level 35%,85% `
  -negate `
  -threshold 42% `
  -morphology Dilate Octagon `
  -blur 0x0.8 `
  $seams

magick -size ${size}x${size} plasma:fractal `
  -colorspace gray `
  -auto-level `
  -contrast-stretch 10%x8% `
  -modulate 70,0,100 `
  -blur 0x1 `
  $stoneNoise

magick $base `
  -shade 132x38 `
  -normalize `
  -colorspace gray `
  -sigmoidal-contrast 5x50% `
  $shading

magick $seams `
  -morphology EdgeOut Diamond `
  -blur 0x0.7 `
  -evaluate Multiply 0.7 `
  $cracks

magick -size ${size}x${size} plasma:fractal `
  -colorspace gray `
  -auto-level `
  -contrast-stretch 25%x12% `
  -threshold 82% `
  -blur 0x0.9 `
  -fill '#ff8a1a' -colorize 100 `
  -modulate 100,160,100 `
  $embers

magick $defaultLight `
  -colorspace gray `
  -threshold 78% `
  -blur 0x6 `
  -fill '#ffb347' -colorize 100 `
  -modulate 100,185,100 `
  $numberGlowLight

magick $defaultDark `
  -colorspace gray `
  -threshold 74% `
  -blur 0x7 `
  -fill '#ff8a1a' -colorize 100 `
  -modulate 100,190,100 `
  $numberGlowDark

& magick $base `
  '(' $stoneNoise '-alpha' 'off' ')' '-compose' 'Overlay' '-composite' `
  '(' $shading '-alpha' 'off' ')' '-compose' 'SoftLight' '-composite' `
  '(' $seams '-fill' '#070303' '-colorize' '100' ')' '-compose' 'Multiply' '-composite' `
  '(' $cracks '-fill' '#ff6b00' '-colorize' '100' ')' '-compose' 'Screen' '-composite' `
  '(' $cracks '-fill' '#ffd06b' '-colorize' '100' -blur '0x1.4' ')' '-compose' 'Screen' '-composite' `
  '(' $embers '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' -size ${size}x${size} radial-gradient:'#ffae42-#2a0905' ')' '-compose' 'SoftLight' '-composite' `
  '-fill' '#33110a' '-colorize' '34' `
  '-brightness-contrast' '-20x44' `
  '-sigmoidal-contrast' '8x38%' `
  '-sharpen' '0x1.4' `
  '-type' 'TrueColor' `
  $preparedLight

& magick $preparedLight `
  '-fill' '#120604' '-colorize' '24' `
  '-modulate' '52,118,100' `
  '-brightness-contrast' '-16x34' `
  '-type' 'TrueColor' `
  $preparedDark

& magick $preparedLight `
  '(' $numberGlowLight '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $defaultLight '-alpha' 'off' '-evaluate' 'Multiply' '0.16' ')' '-compose' 'Screen' '-composite' `
  '-brightness-contrast' '-36x40' `
  '-modulate' '44,142,100' `
  '-sigmoidal-contrast' '7x38%' `
  '-sharpen' '0x1.3' `
  '-type' 'TrueColor' `
  $lightOut

& magick $preparedDark `
  '(' $numberGlowDark '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $defaultDark '-alpha' 'off' '-evaluate' 'Multiply' '0.18' ')' '-compose' 'Screen' '-composite' `
  '-brightness-contrast' '-34x36' `
  '-modulate' '36,146,100' `
  '-sigmoidal-contrast' '7x36%' `
  '-sharpen' '0x1.3' `
  '-type' 'TrueColor' `
  $darkOut

& magick -size ${size}x${size} xc:black `
  '(' $cracks '-fill' '#ff5a00' '-colorize' '100' ')' '-compose' 'Screen' '-composite' `
  '(' $cracks '-fill' '#ffd16f' '-colorize' '100' -blur '0x1.8' ')' '-compose' 'Screen' '-composite' `
  '(' $numberGlowLight '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $embers '-alpha' 'off' -evaluate 'Multiply' '0.85' ')' '-compose' 'Screen' '-composite' `
  '-modulate' '100,170,100' `
  '-brightness-contrast' '6x30' `
  '-type' 'TrueColor' `
  $emissiveLight

& magick -size ${size}x${size} xc:black `
  '(' $cracks '-fill' '#ff5a00' '-colorize' '100' ')' '-compose' 'Screen' '-composite' `
  '(' $cracks '-fill' '#ffd16f' '-colorize' '100' -blur '0x2.1' ')' '-compose' 'Screen' '-composite' `
  '(' $numberGlowDark '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $embers '-alpha' 'off' -evaluate 'Multiply' '0.9' ')' '-compose' 'Screen' '-composite' `
  '-modulate' '100,178,100' `
  '-brightness-contrast' '10x34' `
  '-type' 'TrueColor' `
  $emissiveDark

Write-Output "Generated Tester1 ImageMagick lava texture at $themePath"
