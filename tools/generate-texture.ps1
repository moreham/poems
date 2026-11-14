Add-Type -AssemblyName System.Drawing

$size = 640
$bitmap = New-Object System.Drawing.Bitmap($size, $size)
$random = New-Object System.Random(7419)

for ($y = 0; $y -lt $size; $y++) {
    for ($x = 0; $x -lt $size; $x++) {
        $wave = [Math]::Sin(($x + $y * 0.37) / 23.0) * 2.2
        $noise = $random.Next(-7, 8)
        $r = [Math]::Max(0, [Math]::Min(255, 231 + $noise + $wave))
        $g = [Math]::Max(0, [Math]::Min(255, 219 + $noise + $wave))
        $b = [Math]::Max(0, [Math]::Min(255, 191 + $noise + $wave))
        $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($r, $g, $b))
    }
}

$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$mountainPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(23, 55, 58, 48), 2.0)
$mountainPen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(15, 55, 58, 48), 4.0)
[System.Drawing.Point[]]$mountains = @(
    (New-Object System.Drawing.Point(0, 486)),
    (New-Object System.Drawing.Point(72, 432)),
    (New-Object System.Drawing.Point(131, 470)),
    (New-Object System.Drawing.Point(206, 374)),
    (New-Object System.Drawing.Point(281, 459)),
    (New-Object System.Drawing.Point(345, 402)),
    (New-Object System.Drawing.Point(431, 476)),
    (New-Object System.Drawing.Point(515, 415)),
    (New-Object System.Drawing.Point(640, 493))
)
$graphics.DrawCurve($mountainPen2, $mountains)

[System.Drawing.Point[]]$ridge = @(
    (New-Object System.Drawing.Point(0, 534)),
    (New-Object System.Drawing.Point(105, 487)),
    (New-Object System.Drawing.Point(191, 521)),
    (New-Object System.Drawing.Point(303, 454)),
    (New-Object System.Drawing.Point(391, 506)),
    (New-Object System.Drawing.Point(512, 472)),
    (New-Object System.Drawing.Point(640, 530))
)
$graphics.DrawCurve($mountainPen, $ridge)

$washBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(10, 57, 66, 55))
$graphics.FillEllipse($washBrush, 62, 414, 270, 118)
$graphics.FillEllipse($washBrush, 310, 443, 286, 104)

for ($i = 0; $i -lt 90; $i++) {
    $x = $random.Next(0, $size)
    $y = $random.Next(0, $size)
    $length = $random.Next(7, 34)
    $fiberPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb($random.Next(5, 14), 93, 73, 45), 1.0)
    $graphics.DrawLine($fiberPen, $x, $y, [Math]::Min($size - 1, $x + $length), $y + $random.Next(-2, 3))
    $fiberPen.Dispose()
}

$output = Join-Path $PSScriptRoot "..\assets\paper-texture.png"
$bitmap.Save($output, [System.Drawing.Imaging.ImageFormat]::Png)

$washBrush.Dispose()
$mountainPen.Dispose()
$mountainPen2.Dispose()
$graphics.Dispose()
$bitmap.Dispose()

Write-Output "Generated $output"
