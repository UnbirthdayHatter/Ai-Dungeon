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
$crackHotspots = Join-Path $tempPath 'crack-hotspots.png'
$embers = Join-Path $tempPath 'embers.png'
$numberCoreLight = Join-Path $tempPath 'number-core-light.png'
$numberCoreDark = Join-Path $tempPath 'number-core-dark.png'
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
  -blur 0x0.4 `
  -evaluate Multiply 0.45 `
  $cracks

magick $cracks `
  -blur 0x2.2 `
  -threshold 58% `
  -morphology Dilate Diamond `
  -blur 0x1.4 `
  $crackHotspots

magick -size ${size}x${size} plasma:fractal `
  -colorspace gray `
  -auto-level `
  -contrast-stretch 30%x15% `
  -threshold 87% `
  -blur 0x1.2 `
  -fill '#ff8a1a' -colorize 100 `
  -modulate 100,160,100 `
  $embers

magick $defaultLight `
  -colorspace gray `
  -threshold 84% `
  -blur 0x0.8 `
  -fill '#fffbe8' -colorize 100 `
  -modulate 100,245,100 `
  $numberCoreLight

magick $defaultDark `
  -colorspace gray `
  -threshold 82% `
  -blur 0x0.9 `
  -fill '#fff6dc' -colorize 100 `
  -modulate 100,245,100 `
  $numberCoreDark

magick $defaultLight `
  -colorspace gray `
  -threshold 70% `
  -blur 0x2.8 `
  -fill '#ffcc73' -colorize 100 `
  -modulate 100,210,100 `
  $numberGlowLight

magick $defaultDark `
  -colorspace gray `
  -threshold 66% `
  -blur 0x3.1 `
  -fill '#ffb45c' -colorize 100 `
  -modulate 100,214,100 `
  $numberGlowDark

& magick $base `
  '(' $stoneNoise '-alpha' 'off' ')' '-compose' 'Overlay' '-composite' `
  '(' $shading '-alpha' 'off' ')' '-compose' 'SoftLight' '-composite' `
  '(' $seams '-fill' '#060202' '-colorize' '100' ')' '-compose' 'Multiply' '-composite' `
  '(' $cracks '-fill' '#ff6408' '-colorize' '100' ')' '-compose' 'Screen' '-composite' `
  '(' $cracks '-fill' '#ffbe52' '-colorize' '100' -blur '0x0.8' -evaluate 'Multiply' '0.78' ')' '-compose' 'Screen' '-composite' `
  '(' $crackHotspots '-fill' '#ffe296' '-colorize' '100' -blur '0x2.4' ')' '-compose' 'Screen' '-composite' `
  '(' $embers '-alpha' 'off' -evaluate 'Multiply' '0.48' ')' '-compose' 'Screen' '-composite' `
  '(' -size ${size}x${size} radial-gradient:'#8b2f08-#110604' ')' '-compose' 'SoftLight' '-composite' `
  '-fill' '#160805' '-colorize' '54' `
  '-brightness-contrast' '-34x52' `
  '-sigmoidal-contrast' '10x42%' `
  '-sharpen' '0x1.6' `
  '-type' 'TrueColor' `
  $preparedLight

& magick $preparedLight `
  '-fill' '#120604' '-colorize' '24' `
  '-modulate' '42,112,100' `
  '-brightness-contrast' '-22x32' `
  '-type' 'TrueColor' `
  $preparedDark

& magick $preparedLight `
  '(' $numberGlowLight '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $numberCoreLight '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $defaultLight '-alpha' 'off' '-evaluate' 'Multiply' '0.1' ')' '-compose' 'Screen' '-composite' `
  '-brightness-contrast' '-42x46' `
  '-modulate' '38,132,100' `
  '-sigmoidal-contrast' '8x40%' `
  '-sharpen' '0x1.45' `
  '-type' 'TrueColor' `
  $lightOut

& magick $preparedDark `
  '(' $numberGlowDark '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $numberCoreDark '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $defaultDark '-alpha' 'off' '-evaluate' 'Multiply' '0.12' ')' '-compose' 'Screen' '-composite' `
  '-brightness-contrast' '-40x42' `
  '-modulate' '32,136,100' `
  '-sigmoidal-contrast' '8x38%' `
  '-sharpen' '0x1.45' `
  '-type' 'TrueColor' `
  $darkOut

& magick -size ${size}x${size} xc:black `
  '(' $cracks '-fill' '#ff5a00' '-colorize' '100' ')' '-compose' 'Screen' '-composite' `
  '(' $cracks '-fill' '#ffd16f' '-colorize' '100' -blur '0x1.1' -evaluate 'Multiply' '0.72' ')' '-compose' 'Screen' '-composite' `
  '(' $crackHotspots '-fill' '#fff0b6' '-colorize' '100' -blur '0x1.8' ')' '-compose' 'Screen' '-composite' `
  '(' $numberGlowLight '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $numberCoreLight '-alpha' 'off' -evaluate 'Multiply' '1.85' ')' '-compose' 'Screen' '-composite' `
  '(' $embers '-alpha' 'off' -evaluate 'Multiply' '0.42' ')' '-compose' 'Screen' '-composite' `
  '-modulate' '100,176,100' `
  '-brightness-contrast' '18x46' `
  '-type' 'TrueColor' `
  $emissiveLight

& magick -size ${size}x${size} xc:black `
  '(' $cracks '-fill' '#ff5a00' '-colorize' '100' ')' '-compose' 'Screen' '-composite' `
  '(' $cracks '-fill' '#ffd16f' '-colorize' '100' -blur '0x1.3' -evaluate 'Multiply' '0.72' ')' '-compose' 'Screen' '-composite' `
  '(' $crackHotspots '-fill' '#fff0b6' '-colorize' '100' -blur '0x2.1' ')' '-compose' 'Screen' '-composite' `
  '(' $numberGlowDark '-alpha' 'off' ')' '-compose' 'Screen' '-composite' `
  '(' $numberCoreDark '-alpha' 'off' -evaluate 'Multiply' '1.95' ')' '-compose' 'Screen' '-composite' `
  '(' $embers '-alpha' 'off' -evaluate 'Multiply' '0.46' ')' '-compose' 'Screen' '-composite' `
  '-modulate' '100,182,100' `
  '-brightness-contrast' '20x50' `
  '-type' 'TrueColor' `
  $emissiveDark

Write-Output "Generated Tester1 ImageMagick lava texture at $themePath"
