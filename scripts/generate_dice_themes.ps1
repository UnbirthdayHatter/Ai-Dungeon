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
  @{ Id = 'rosegold'; Name = 'Rosegold'; Pattern = 'filigree' },
  @{ Id = 'aurora'; Name = 'Aurora'; Pattern = 'aurora' },
  @{ Id = 'voidfire'; Name = 'Voidfire'; Pattern = 'voidfire' },
  @{ Id = 'toxic'; Name = 'Toxic'; Pattern = 'toxic' },
  @{ Id = 'glitchpop'; Name = 'Glitchpop'; Pattern = 'glitch' },
  @{ Id = 'wacky'; Name = 'Wacky'; Pattern = 'wacky' },
  @{ Id = 'tester1'; Name = 'Tester1'; Pattern = 'cobblestone' },
  @{ Id = 'wacky_a'; Name = 'Wacky A'; Pattern = 'wacky' },
  @{ Id = 'wacky_b'; Name = 'Wacky B'; Pattern = 'wacky' },
  @{ Id = 'wacky_c'; Name = 'Wacky C'; Pattern = 'wacky' },
  @{ Id = 'wacky_d'; Name = 'Wacky D'; Pattern = 'wacky' }
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
        $darken = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 168 } else { 120 }), 4, 6, 18))
        $graphics.FillRectangle($darken, $rect)
        $darken.Dispose()

        $glowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
          ([System.Drawing.Point]::new(0, 0)),
          ([System.Drawing.Point]::new($width, $height)),
          ([System.Drawing.Color]::FromArgb($(if ($isLight) { 32 } else { 20 }), 46, 196, 255)),
          ([System.Drawing.Color]::FromArgb(0, 20, 40, 92))
        )
        $graphics.FillRectangle($glowBrush, $rect)
        $glowBrush.Dispose()
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
    'aurora' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 48 } else { 36 }), 8, 14, 20))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()
    }
    'voidfire' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 148 } else { 116 }), 10, 4, 30))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()

      $glowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        ([System.Drawing.Point]::new(0, 0)),
        ([System.Drawing.Point]::new($width, $height)),
        ([System.Drawing.Color]::FromArgb($(if ($isLight) { 74 } else { 48 }), 168, 85, 247)),
        ([System.Drawing.Color]::FromArgb(0, 24, 8, 42))
      )
      $graphics.FillRectangle($glowBrush, $rect)
      $glowBrush.Dispose()
    }
    'toxic' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 78 } else { 56 }), 8, 16, 4))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()
    }
    'glitch' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 66 } else { 48 }), 12, 8, 16))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()
    }
    'wacky' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 48 } else { 36 }), 14, 10, 24))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()
    }
    'cobblestone' {
      $shade = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($(if ($isLight) { 66 } else { 48 }), 20, 20, 22))
      $graphics.FillRectangle($shade, $rect)
      $shade.Dispose()

      $glowBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        ([System.Drawing.Point]::new(0, 0)),
        ([System.Drawing.Point]::new($width, $height)),
        ([System.Drawing.Color]::FromArgb($(if ($isLight) { 26 } else { 18 }), 148, 163, 184)),
        ([System.Drawing.Color]::FromArgb(0, 36, 36, 40))
      )
      $graphics.FillRectangle($glowBrush, $rect)
      $glowBrush.Dispose()
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
        for ($i = 0; $i -lt 20; $i++) {
          $gray = if ($isLight) { $random.Next(170, 245) } else { $random.Next(225, 255) }
          $pen = New-PatternPen $gray ($random.Next(44, 110)) (($random.NextDouble() * 3.1) + 1.4)
          $rect = New-Object System.Drawing.Rectangle($random.Next(-120, 280), $random.Next(-80, 240), $random.Next(180, 360), $random.Next(120, 320))
          $graphics.DrawArc($pen, $rect, $random.Next(0, 360), $random.Next(70, 180))
          $pen.Dispose()
        }
        for ($i = 0; $i -lt 90; $i++) {
          $size = $random.Next(3, 10)
          $x = $random.Next(0, $width)
          $y = $random.Next(0, $height)
          $starBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($random.Next(26, 76), 108, 232, 255))
          $graphics.FillEllipse($starBrush, $x, $y, $size, $size)
          $starBrush.Dispose()
        }
        Draw-NoiseDots $graphics 900 4 220 255 120 220 $random $width $height
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
    'aurora' {
      $canvasWidth = [int]$width
      $canvasHeight = [int]$height
      for ($i = 0; $i -lt 18; $i++) {
        $gray = if ($isLight) { $random.Next(170, 245) } else { $random.Next(190, 255) }
        $pen = New-PatternPen $gray ($random.Next(28, 72)) (($random.NextDouble() * 5.0) + 3.0)
        $points = New-Object 'System.Drawing.Point[]' 4
        $points[0] = New-Object System.Drawing.Point(-40, $random.Next(0, $canvasHeight))
        $points[1] = New-Object System.Drawing.Point($random.Next(160, 320), $random.Next(0, $canvasHeight))
        $points[2] = New-Object System.Drawing.Point($random.Next(520, 720), $random.Next(0, $canvasHeight))
        $points[3] = New-Object System.Drawing.Point(($canvasWidth + 40), $random.Next(0, $canvasHeight))
        $graphics.DrawCurve($pen, $points, 0.45)
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 260 3 210 255 45 90 $random $width $height
    }
    'voidfire' {
      for ($i = 0; $i -lt 26; $i++) {
        $gray = if ($isLight) { $random.Next(195, 255) } else { $random.Next(220, 255) }
        $pen = New-PatternPen $gray ($random.Next(70, 150)) (($random.NextDouble() * 4.2) + 1.8)
        $points = New-Object 'System.Drawing.Point[]' 6
        for ($p = 0; $p -lt 6; $p++) {
          $points[$p] = New-Object System.Drawing.Point($random.Next(0, $width), $random.Next(0, $height))
        }
        $graphics.DrawCurve($pen, $points, 0.55)
        $pen.Dispose()
      }
      for ($i = 0; $i -lt 220; $i++) {
        $size = $random.Next(4, 12)
        $x = $random.Next(0, $width)
        $y = $random.Next(0, $height)
        $flareBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($random.Next(24, 72), 192, 132, 252))
        $graphics.FillEllipse($flareBrush, $x, $y, $size, $size)
        $flareBrush.Dispose()
      }
      for ($i = 0; $i -lt 90; $i++) {
        $size = $random.Next(5, 18)
        $x = $random.Next(0, $width)
        $y = $random.Next(0, $height)
        $purpleWash = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($random.Next(10, 34), 124, 58, 237))
        $graphics.FillEllipse($purpleWash, $x, $y, $size, $size)
        $purpleWash.Dispose()
      }
      Draw-NoiseDots $graphics 360 4 225 255 42 96 $random $width $height
    }
    'toxic' {
      for ($i = 0; $i -lt 24; $i++) {
        $gray = if ($isLight) { $random.Next(185, 245) } else { $random.Next(200, 255) }
        $pen = New-PatternPen $gray ($random.Next(62, 128)) (($random.NextDouble() * 3.5) + 1.2)
        $x = $random.Next(0, $width)
        $y = $random.Next(0, $height)
        $graphics.DrawEllipse($pen, $x, $y, $random.Next(24, 130), $random.Next(24, 130))
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 340 5 180 255 35 82 $random $width $height
    }
    'glitch' {
      for ($i = 0; $i -lt 48; $i++) {
        $gray = if ($isLight) { $random.Next(195, 255) } else { $random.Next(210, 255) }
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($random.Next(35, 95), $gray, $gray, $gray))
        $graphics.FillRectangle($brush, $random.Next(0, $width), $random.Next(0, $height), $random.Next(40, 240), $random.Next(2, 18))
        $brush.Dispose()
      }
      Draw-NoiseDots $graphics 180 3 210 255 40 95 $random $width $height
    }
    'wacky' {
      for ($i = 0; $i -lt 64; $i++) {
        $color = switch ($i % 5) {
          0 { [System.Drawing.Color]::FromArgb($random.Next(48, 110), 255, 64, 129) }
          1 { [System.Drawing.Color]::FromArgb($random.Next(48, 110), 34, 211, 238) }
          2 { [System.Drawing.Color]::FromArgb($random.Next(48, 110), 250, 204, 21) }
          3 { [System.Drawing.Color]::FromArgb($random.Next(48, 110), 163, 230, 53) }
          default { [System.Drawing.Color]::FromArgb($random.Next(48, 110), 168, 85, 247) }
        }
        $brush = New-Object System.Drawing.SolidBrush($color)
        if ($i % 2 -eq 0) {
          $graphics.FillEllipse($brush, $random.Next(0, $width), $random.Next(0, $height), $random.Next(20, 120), $random.Next(12, 80))
        } else {
          $graphics.FillRectangle($brush, $random.Next(0, $width), $random.Next(0, $height), $random.Next(24, 160), $random.Next(4, 28))
        }
        $brush.Dispose()
      }
      for ($i = 0; $i -lt 18; $i++) {
        $gray = $random.Next(210, 255)
        $pen = New-PatternPen $gray ($random.Next(36, 90)) (($random.NextDouble() * 3.4) + 1.4)
        $points = New-Object 'System.Drawing.Point[]' 5
        for ($p = 0; $p -lt 5; $p++) {
          $points[$p] = New-Object System.Drawing.Point($random.Next(0, $width), $random.Next(0, $height))
        }
        $graphics.DrawCurve($pen, $points, 0.5)
        $pen.Dispose()
      }
      Draw-NoiseDots $graphics 260 4 220 255 40 110 $random $width $height
    }
    'cobblestone' {
      for ($row = 0; $row -lt 7; $row++) {
        $stonesInRow = 4 + ($row % 2)
        $baseY = [int](($row / 7.0) * $height) - 10
        for ($col = 0; $col -lt $stonesInRow; $col++) {
          $stoneWidth = [int](($width / $stonesInRow) * (0.78 + ($random.NextDouble() * 0.24)))
          $stoneHeight = [int](($height / 7.0) * (0.72 + ($random.NextDouble() * 0.26)))
          $offsetX = if ($row % 2 -eq 0) { 0 } else { [int](($width / $stonesInRow) * 0.35) }
          $x = [int](($col / [Math]::Max(1, $stonesInRow)) * $width) + $offsetX - 16 + $random.Next(-8, 10)
          $y = $baseY + $random.Next(-6, 8)
          $stoneRect = New-Object System.Drawing.Rectangle($x, $y, $stoneWidth, $stoneHeight)

          $fillGray = if ($isLight) { $random.Next(126, 170) } else { $random.Next(150, 210) }
          $fillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($random.Next(34, 68), $fillGray, $fillGray, ($fillGray + $random.Next(-8, 14))))
          $graphics.FillEllipse($fillBrush, $stoneRect)
          $fillBrush.Dispose()

          $edgeGray = if ($isLight) { $random.Next(150, 205) } else { $random.Next(200, 240) }
          $pen = New-PatternPen $edgeGray ($random.Next(42, 88)) (($random.NextDouble() * 2.2) + 1.2)
          $graphics.DrawEllipse($pen, $stoneRect)
          $pen.Dispose()

          for ($i = 0; $i -lt 3; $i++) {
            $crackPen = New-PatternPen ($edgeGray - $random.Next(10, 26)) ($random.Next(18, 40)) (($random.NextDouble() * 1.2) + 0.4)
            $x1 = $x + $random.Next(8, [Math]::Max(10, $stoneWidth - 8))
            $y1 = $y + $random.Next(8, [Math]::Max(10, $stoneHeight - 8))
            $x2 = [Math]::Min($width, [Math]::Max(0, $x1 + $random.Next(-18, 18)))
            $y2 = [Math]::Min($height, [Math]::Max(0, $y1 + $random.Next(-18, 18)))
            $graphics.DrawLine($crackPen, $x1, $y1, $x2, $y2)
            $crackPen.Dispose()
          }
        }
      }

      for ($i = 0; $i -lt 24; $i++) {
        $mortarPen = New-PatternPen ($(if ($isLight) { $random.Next(90, 120) } else { $random.Next(130, 170) })) ($random.Next(22, 46)) (($random.NextDouble() * 1.6) + 0.8)
        $points = New-Object 'System.Drawing.Point[]' 4
        for ($p = 0; $p -lt 4; $p++) {
          $points[$p] = New-Object System.Drawing.Point($random.Next(0, $width), $random.Next(0, $height))
        }
        $graphics.DrawCurve($mortarPen, $points, 0.45)
        $mortarPen.Dispose()
      }

      Draw-NoiseDots $graphics 340 3 150 225 18 44 $random $width $height
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

function Draw-PatternLines($graphics, [string]$pattern, $random, [bool]$isLight, [int]$width, [int]$height) {
  Draw-Pattern $graphics $pattern $random $isLight ([int]$width) ([int]$height)
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
