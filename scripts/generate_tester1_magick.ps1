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
$moss = Join-Path $tempPath 'moss.png'
$preparedLight = Join-Path $tempPath 'prepared-light.png'
$preparedDark = Join-Path $tempPath 'prepared-dark.png'
$lightOut = Join-Path $themePath 'diffuse-light.png'
$darkOut = Join-Path $themePath 'diffuse-dark.png'
$defaultLight = Join-Path $defaultThemePath 'diffuse-light.png'
$defaultDark = Join-Path $defaultThemePath 'diffuse-dark.png'

foreach ($file in @('default.json', 'normal.png', 'specular.jpg')) {
  Copy-Item (Join-Path $defaultThemePath $file) (Join-Path $themePath $file) -Force
}

magick -size ${size}x${size} xc:"#8b7968" `
  -sparse-color Voronoi $pointSpec `
  -colorspace sRGB `
  -blur 0x2.2 `
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
  -evaluate Multiply 0.55 `
  $cracks

magick -size ${size}x${size} plasma:fractal `
  -colorspace gray `
  -contrast-stretch 18%x12% `
  -threshold 66% `
  -blur 0x1.1 `
  -fill '#556b2f' -colorize 100 `
  -modulate 100,135,100 `
  $moss

& magick $base `
  '(' $stoneNoise '-alpha' 'off' ')' '-compose' 'Overlay' '-composite' `
  '(' $shading '-alpha' 'off' ')' '-compose' 'SoftLight' '-composite' `
  '(' $seams '-fill' '#34261d' '-colorize' '100' ')' '-compose' 'Multiply' '-composite' `
  '(' $cracks '-fill' '#d8c1aa' '-colorize' '100' ')' '-compose' 'Screen' '-composite' `
  '(' $moss '-alpha' 'off' ')' '-compose' 'SoftLight' '-composite' `
  '(' -size ${size}x${size} radial-gradient:'#cbb7a1-#6f5f52' ')' '-compose' 'SoftLight' '-composite' `
  '-fill' '#8f7a68' '-colorize' '22' `
  '-brightness-contrast' '-10x28' `
  '-sigmoidal-contrast' '7x44%' `
  '-sharpen' '0x1.2' `
  '-type' 'TrueColor' `
  $preparedLight

& magick $preparedLight `
  '-fill' '#3d2f27' '-colorize' '18' `
  '-modulate' '58,92,100' `
  '-brightness-contrast' '-18x20' `
  '-type' 'TrueColor' `
  $preparedDark

& magick $preparedLight `
  '(' $defaultLight '-alpha' 'off' '-evaluate' 'Multiply' '0.16' ')' '-compose' 'Screen' '-composite' `
  '-brightness-contrast' '-30x26' `
  '-modulate' '54,108,100' `
  '-sigmoidal-contrast' '6x44%' `
  '-sharpen' '0x1.2' `
  '-type' 'TrueColor' `
  $lightOut

& magick $preparedDark `
  '(' $defaultDark '-alpha' 'off' '-evaluate' 'Multiply' '0.18' ')' '-compose' 'Screen' '-composite' `
  '-brightness-contrast' '-28x22' `
  '-modulate' '44,108,100' `
  '-sigmoidal-contrast' '6x42%' `
  '-sharpen' '0x1.2' `
  '-type' 'TrueColor' `
  $darkOut

Write-Output "Generated Tester1 ImageMagick stone texture at $themePath"
