$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$baseThemePath = Join-Path $root 'public\assets\themes\default'
$themesRoot = Join-Path $root 'public\assets\themes'

$themes = @(
  @{ Id = 'sunforged'; Name = 'Sunforged'; Pattern = 'sun' },
  @{ Id = 'obsidian'; Name = 'Obsidian'; Pattern = 'obsidian' },
  @{ Id = 'ivory'; Name = 'Ivory'; Pattern = 'ivory' },
  @{ Id = 'celestial'; Name = 'Celestial'; Pattern = 'celestial' },
  @{ Id = 'bloodstone'; Name = 'Bloodstone'; Pattern = 'bloodstone' },
  @{ Id = 'emerald'; Name = 'Emerald'; Pattern = 'gem' },
  @{ Id = 'sapphire'; Name = 'Sapphire'; Pattern = 'gem' },
  @{ Id = 'amethyst'; Name = 'Amethyst'; Pattern = 'gem' },
  @{ Id = 'rosegold'; Name = 'Rosegold'; Pattern = 'filigree' }
)

function New-BrushColor([int]$value, [int]$alpha = 255) {
  return [System.Drawing.Color]::FromArgb($alpha, $value, $value, $value)
}

function New-PatternPen([int]$gray, [int]$alpha, [double]$width) {
  return [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb($alpha, $gray, $gray, $gray), [single]$width)
}

function Apply-ToneOverlay($graphics, [string]$pattern, [bool]$isLight, [int]$width, [int]$height) {
  $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
  switch ($pattern) {
    'celestial' {
      $darken = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 125 } else { 90 }), 8, 8, 18))
      $graphics.FillRectangle($darken, $rect)
      $darken.Dispose()
    }
    'bloodstone' {
      $darken = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 95 } else { 72 }), 14, 4, 4))
      $graphics.FillRectangle($darken, $rect)
      $darken.Dispose()
    }
    'obsidian' {
      $darken = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 70 } else { 55 }), 6, 6, 8))
      $graphics.FillRectangle($darken, $rect)
      $darken.Dispose()
    }
    'gem' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 34 } else { 26 }), 18, 18, 18))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()
    }
    'filigree' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 24 } else { 18 }), 20, 12, 10))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()
    }
  }
}

function Draw-NoiseDots($graphics, [int]$count, [int]$size, [int]$minGray, [int]$maxGray, [int]$alphaMin, [int]$alphaMax, $random, [int]$width, [int]$height) {
  for ($i = 0; $i -lt $count; $i++) {
    $gray = $random.Next($minGray, $maxGray)
    $alpha = $random.Next($alphaMin, $alphaMax)
    $x = $random.Next(0, $width)
    $y = $random.Next(0, $height)
    $dotSize = $random.Next(1, $size + 1)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($alpha, $gray, $gray, $gray))
    $graphics.FillEllipse($brush, $x, $y, $dotSize, $dotSize)
    $brush.Dispose()
  }
}

function Draw-Pattern($graphics, [string]$pattern, $random, [bool]$isLight, [int]$width, [int]$height) {
  switch ($pattern) {
    'obsidian' {
      for ($i = 0; $i -lt 12; $i++) {
        $gray = if ($isLight) { $random.Next(75, 130) } else { $random.Next(165, 215) }
        $pen = New-PatternPen $gray ($random.Next(80, 140)) (($random.NextDouble() * 2.0) + 1.0)
        $points = New-Object 'System.Drawing.Point[]' 4
        for ($p = 0; $p -lt 4; $p++) {
          $points[$p] = New-Object System.Drawing.Point($random.Next(0, $width), $random.Next(0, $height))
        }
        $graphics.DrawCurve($pen, $points)
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 260 3 90 170 18 40 $random $width $height
    }
    'ivory' {
      for ($i = 0; $i -lt 70; $i++) {
        $gray = if ($isLight) { $random.Next(155, 205) } else { $random.Next(110, 150) }
        $pen = New-PatternPen $gray ($random.Next(18, 36)) (($random.NextDouble() * 1.8) + 0.4)
        $y = $random.Next(0, $height)
        $graphics.DrawLine($pen, 0, $y, $width, $y + $random.Next(-18, 18))
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 700 2 120 210 10 28 $random $width $height
    }
    'celestial' {
      for ($i = 0; $i -lt 14; $i++) {
        $gray = if ($isLight) { $random.Next(150, 225) } else { $random.Next(210, 255) }
        $pen = New-PatternPen $gray ($random.Next(26, 72)) (($random.NextDouble() * 2.6) + 1.2)
        $rect = New-Object System.Drawing.Rectangle($random.Next(-120, 280), $random.Next(-80, 240), $random.Next(180, 360), $random.Next(120, 320))
        $graphics.DrawArc($pen, $rect, $random.Next(0, 360), $random.Next(70, 180))
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 620 4 210 255 85 175 $random $width $height
    }
    'bloodstone' {
      for ($i = 0; $i -lt 18; $i++) {
        $gray = if ($isLight) { $random.Next(190, 245) } else { $random.Next(215, 255) }
        $pen = New-PatternPen $gray ($random.Next(85, 145)) (($random.NextDouble() * 3.4) + 1.6)
        $points = New-Object 'System.Drawing.Point[]' 6
        for ($p = 0; $p -lt 6; $p++) {
          $points[$p] = New-Object System.Drawing.Point($random.Next(0, $width), $random.Next(0, $height))
        }
        $graphics.DrawCurve($pen, $points)
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 320 4 150 235 28 64 $random $width $height
    }
    'filigree' {
      for ($i = 0; $i -lt 16; $i++) {
        $gray = if ($isLight) { $random.Next(110, 170) } else { $random.Next(175, 235) }
        $pen = New-PatternPen $gray ($random.Next(35, 65)) (($random.NextDouble() * 1.8) + 0.8)
        $rect = New-Object System.Drawing.Rectangle($random.Next(-80, 280), $random.Next(-60, 280), $random.Next(90, 220), $random.Next(90, 220))
        $graphics.DrawArc($pen, $rect, $random.Next(0, 360), $random.Next(80, 220))
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 220 2 120 210 18 36 $random $width $height
    }
    'sun' {
      for ($i = 0; $i -lt 18; $i++) {
        $gray = if ($isLight) { $random.Next(110, 180) } else { $random.Next(165, 235) }
        $pen = New-PatternPen $gray ($random.Next(28, 55)) (($random.NextDouble() * 1.6) + 0.8)
        $centerX = $width / 2
        $centerY = $height / 2
        $angle = ($i / 18.0) * [Math]::PI * 2
        $length = $random.Next(120, 260)
        $x2 = [int]($centerX + [Math]::Cos($angle) * $length)
        $y2 = [int]($centerY + [Math]::Sin($angle) * $length)
        $graphics.DrawLine($pen, [int]$centerX, [int]$centerY, $x2, $y2)
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 180 3 150 225 20 42 $random $width $height
    }
    default {
      for ($i = 0; $i -lt 20; $i++) {
        $gray = if ($isLight) { $random.Next(110, 175) } else { $random.Next(175, 235) }
        $pen = New-PatternPen $gray ($random.Next(26, 52)) (($random.NextDouble() * 1.8) + 0.9)
        $x1 = $random.Next(0, $width)
        $y1 = $random.Next(0, $height)
        $x2 = [Math]::Min($width, [Math]::Max(0, $x1 + $random.Next(-180, 180)))
        $y2 = [Math]::Min($height, [Math]::Max(0, $y1 + $random.Next(-180, 180)))
        $graphics.DrawLine($pen, $x1, $y1, $x2, $y2)
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 220 3 120 200 14 34 $random $width $height
    }
  }
}

function New-DiffuseTexture([string]$path, [string]$pattern, [bool]$isLight) {
  $baseTexture = Join-Path $baseThemePath $(if ($isLight) { 'diffuse-light.png' } else { 'diffuse-dark.png' })
  $bitmap = [System.Drawing.Bitmap]::new($baseTexture)
  $size = $bitmap.Width
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

  $random = [System.Random]::new(([Math]::Abs($path.GetHashCode()) % 200000) + $(if ($isLight) { 1 } else { 2 }))

  Apply-ToneOverlay $graphics $pattern $isLight $size $size
  Draw-Pattern $graphics $pattern $random $isLight $size $size

  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

foreach ($theme in $themes) {
  $themePath = Join-Path $themesRoot $theme.Id
  if (-not (Test-Path $themePath)) {
    New-Item -ItemType Directory -Path $themePath | Out-Null
  }

  foreach ($file in @('default.json', 'normal.png', 'specular.jpg')) {
    Copy-Item (Join-Path $baseThemePath $file) (Join-Path $themePath $file) -Force
  }

  $config = @"
{
  "name": "$($theme.Name)",
  "systemName": "$($theme.Id)",
  "author": "Codex",
  "version": 1,
  "meshFile": "default.json",
  "material": {
    "type": "color",
    "diffuseTexture": {
      "light": "diffuse-light.png",
      "dark": "diffuse-dark.png"
    },
    "diffuseLevel": 1,
    "bumpTexture": "normal.png",
    "bumpLevel": 0.5,
    "specularTexture": "specular.jpg",
    "specularPower": 1
  },
  "diceAvailable": ["d4", "d6", "d8", "d10", "d12", "d20", "d100"]
}
"@
  Set-Content -Path (Join-Path $themePath 'theme.config.json') -Value $config -Encoding UTF8
  New-DiffuseTexture (Join-Path $themePath 'diffuse-light.png') $theme.Pattern $true
  New-DiffuseTexture (Join-Path $themePath 'diffuse-dark.png') $theme.Pattern $false
}

Write-Host "Generated dice themes:" ($themes.Id -join ', ')
