param(
  [Parameter(Mandatory = $true)]
  [string]$InputDirectory,

  [Parameter(Mandatory = $true)]
  [string]$OutputJsonLines
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Runtime.WindowsRuntime
[Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Storage.FileAccessMode, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime] | Out-Null

function Await-WinRT {
  param(
    [Parameter(Mandatory = $true)]$Operation,
    [Parameter(Mandatory = $true)][Type]$ResultType
  )

  $method = [System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
      $_.Name -eq "AsTask" -and
      $_.IsGenericMethod -and
      $_.GetParameters().Count -eq 1
    } |
    Select-Object -First 1
  $task = $method.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
  return $task.GetAwaiter().GetResult()
}

$source = (Resolve-Path -LiteralPath $InputDirectory).Path
$output = [System.IO.Path]::GetFullPath($OutputJsonLines)
$outputDirectory = [System.IO.Path]::GetDirectoryName($output)
if ($outputDirectory) {
  [System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
}

$language = [Windows.Globalization.Language]::new("zh-Hans-CN")
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language)
if (-not $engine) {
  throw "Windows Simplified Chinese OCR is unavailable."
}

$encoding = [System.Text.UTF8Encoding]::new($false)
$writer = [System.IO.StreamWriter]::new($output, $false, $encoding)

try {
  $files = Get-ChildItem -LiteralPath $source -File |
    Where-Object { @(".jpg", ".jpeg", ".png") -contains $_.Extension.ToLowerInvariant() } |
    Sort-Object Name

  foreach ($fileInfo in $files) {
    $file = Await-WinRT (
      [Windows.Storage.StorageFile]::GetFileFromPathAsync($fileInfo.FullName)
    ) ([Windows.Storage.StorageFile])
    $stream = Await-WinRT (
      $file.OpenAsync([Windows.Storage.FileAccessMode]::Read)
    ) ([Windows.Storage.Streams.IRandomAccessStream])

    try {
      $decoder = Await-WinRT (
        [Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)
      ) ([Windows.Graphics.Imaging.BitmapDecoder])
      $bitmap = Await-WinRT (
        $decoder.GetSoftwareBitmapAsync()
      ) ([Windows.Graphics.Imaging.SoftwareBitmap])

      try {
        $result = Await-WinRT (
          $engine.RecognizeAsync($bitmap)
        ) ([Windows.Media.Ocr.OcrResult])
        $lines = foreach ($line in $result.Lines) {
          $words = @($line.Words)
          if ($words.Count -eq 0) {
            continue
          }

          $left = ($words | ForEach-Object { $_.BoundingRect.X } | Measure-Object -Minimum).Minimum
          $top = ($words | ForEach-Object { $_.BoundingRect.Y } | Measure-Object -Minimum).Minimum
          $right = ($words | ForEach-Object {
            $_.BoundingRect.X + $_.BoundingRect.Width
          } | Measure-Object -Maximum).Maximum
          $bottom = ($words | ForEach-Object {
            $_.BoundingRect.Y + $_.BoundingRect.Height
          } | Measure-Object -Maximum).Maximum

          [ordered]@{
            text = $line.Text
            x = [Math]::Round([double]$left, 2)
            y = [Math]::Round([double]$top, 2)
            width = [Math]::Round([double]($right - $left), 2)
            height = [Math]::Round([double]($bottom - $top), 2)
          }
        }

        $row = [ordered]@{
          file = $fileInfo.Name
          width = $bitmap.PixelWidth
          height = $bitmap.PixelHeight
          text = $result.Text
          lines = @($lines)
        }
        $writer.WriteLine(($row | ConvertTo-Json -Depth 6 -Compress))
        $writer.Flush()
      }
      finally {
        $bitmap.Dispose()
      }
    }
    finally {
      $stream.Dispose()
    }
  }
}
finally {
  $writer.Dispose()
}
