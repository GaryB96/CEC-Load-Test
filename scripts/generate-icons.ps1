# Generate PNG fallbacks for the chosen SVG icon
# Usage: Open PowerShell in the repo root and run: .\scripts\generate-icons.ps1

$svg = "icons/load-home-bolt.svg"
$out192 = "icons/load-home-bolt-192.png"
$out512 = "icons/load-home-bolt-512.png"

Write-Host "Generating PNG fallbacks from $svg"

# Prefer ImageMagick (magick) if available
if (Get-Command magick -ErrorAction SilentlyContinue) {
    Write-Host "Using ImageMagick (magick) to generate PNGs..."
    magick convert $svg -background none -resize 192x192 $out192
    magick convert $svg -background none -resize 512x512 $out512
    Write-Host "Generated: $out192, $out512"
    exit 0
}

# Fallback to inkscape if available
if (Get-Command inkscape -ErrorAction SilentlyContinue) {
    Write-Host "Using Inkscape to export PNGs..."
    inkscape $svg --export-filename=$out192 --export-width=192 --export-height=192
    inkscape $svg --export-filename=$out512 --export-width=512 --export-height=512
    Write-Host "Generated: $out192, $out512"
    exit 0
}

Write-Warning "Neither ImageMagick (magick) nor Inkscape was found in PATH."
Write-Host "Please install one of them or generate PNGs manually. Example ImageMagick commands:" 
Write-Host "  magick convert icons/load-home-bolt.svg -background none -resize 192x192 icons/load-home-bolt-192.png"
Write-Host "  magick convert icons/load-home-bolt.svg -background none -resize 512x512 icons/load-home-bolt-512.png"

Write-Host "Or use Inkscape:" 
Write-Host "  inkscape icons/load-home-bolt.svg --export-filename=icons/load-home-bolt-192.png --export-width=192 --export-height=192"
Write-Host "  inkscape icons/load-home-bolt.svg --export-filename=icons/load-home-bolt-512.png --export-width=512 --export-height=512"

exit 1
