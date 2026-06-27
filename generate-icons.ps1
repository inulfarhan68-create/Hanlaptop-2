Add-Type -AssemblyName System.Drawing
$srcPath = "C:\Users\inulf\OneDrive\Documents\Hanlaptop-2\public\logo.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

function Create-PaddedIcon {
    param([int]$size, [string]$outPath, [int]$padding)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High quality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#0f172a"))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)
    
    $targetSize = $size - ($padding * 2)
    $ratio = [math]::Min($targetSize / $src.Width, $targetSize / $src.Height)
    $w = [int]($src.Width * $ratio)
    $h = [int]($src.Height * $ratio)
    
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)
    
    $g.DrawImage($src, $x, $y, $w, $h)
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

Create-PaddedIcon -size 192 -outPath "C:\Users\inulf\OneDrive\Documents\Hanlaptop-2\public\icon-192.png" -padding 28
Create-PaddedIcon -size 512 -outPath "C:\Users\inulf\OneDrive\Documents\Hanlaptop-2\public\icon-512.png" -padding 75
Create-PaddedIcon -size 192 -outPath "C:\Users\inulf\OneDrive\Documents\Hanlaptop-2\public\icon-192-maskable.png" -padding 40
Create-PaddedIcon -size 512 -outPath "C:\Users\inulf\OneDrive\Documents\Hanlaptop-2\public\icon-512-maskable.png" -padding 100

$src.Dispose()
