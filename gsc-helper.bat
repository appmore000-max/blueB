<# : batch portion — double-click this .bat on Windows; it launches the PowerShell part below.
@echo off & setlocal
title GSC helper
powershell -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "[ScriptBlock]::Create((Get-Content -LiteralPath \"%~f0\" -Encoding UTF8 -Raw)).Invoke()"
endlocal
goto :EOF
: end batch / begin PowerShell #>

# ============================================================
#  這台能不能玩？ — 本機小助手（gsc-helper.bat）
#  只做三件事：讀取這台電腦的硬體資訊、印出一行可貼到網頁的結果並複製到剪貼簿、
#  在 127.0.0.1 開一個只有本機能連的小服務，讓網頁按「一鍵檢測」時能自動取得資料。
#  不會安裝任何東西、不會改任何設定、不會把資料傳到網路上。用完直接關閉視窗即可。
# ============================================================
$SiteUrl = ""          # 網頁提供下載時會自動填入網址；空白就不會自動開啟瀏覽器
$Port = 27321          # 佔用時會自動改用 27322、27323
$TimeoutMinutes = 30   # 閒置多久後自動關閉

$ErrorActionPreference = 'SilentlyContinue'

function Get-Specs {
  $spec = [ordered]@{ ok = $true; version = 1; time = (Get-Date).ToString('s') }
  try { $cpu = Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1
        $spec.cpu = [ordered]@{ name = "$($cpu.Name)".Trim(); cores = $cpu.NumberOfCores; threads = $cpu.NumberOfLogicalProcessors } } catch { $spec.cpu = $null }
  try { $spec.gpus = @(Get-CimInstance Win32_VideoController -ErrorAction Stop | ForEach-Object {
          [ordered]@{ name = "$($_.Name)".Trim(); driver = "$($_.DriverVersion)"; width = $_.CurrentHorizontalResolution; height = $_.CurrentVerticalResolution; hz = $_.CurrentRefreshRate } }) } catch { $spec.gpus = @() }
  try { $spec.ramGB = [math]::Round((Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).TotalPhysicalMemory / 1GB, 1) } catch { $spec.ramGB = $null }
  try { $spec.disks = @(Get-PhysicalDisk -ErrorAction Stop | ForEach-Object {
          $t = "$($_.MediaType)"; $b = "$($_.BusType)"
          if (($t -eq 'Unspecified' -or -not $t) -and $b -eq 'NVMe') { $t = 'SSD' }
          [ordered]@{ name = "$($_.FriendlyName)"; type = $t; bus = $b; sizeGB = [math]::Round($_.Size / 1GB) } }) } catch { $spec.disks = @() }
  try { $spec.volumes = @(Get-PSDrive -PSProvider FileSystem -ErrorAction Stop | Where-Object { $_.Used -ne $null -and ($_.Used + $_.Free) -gt 0 } | ForEach-Object {
          [ordered]@{ letter = "$($_.Name)"; freeGB = [math]::Round($_.Free / 1GB); totalGB = [math]::Round(($_.Used + $_.Free) / 1GB) } }) } catch { $spec.volumes = @() }
  try { $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
        $spec.os = [ordered]@{ name = "$($os.Caption)".Trim(); version = "$($os.Version)"; build = "$($os.BuildNumber)" } } catch { $spec.os = $null }
  $spec.systemDrive = "$env:SystemDrive".TrimEnd(':')
  return $spec
}

Write-Host ''
Write-Host '  === 這台能不能玩？ 本機小助手 ===' -ForegroundColor Cyan
Write-Host '  正在讀取硬體資訊…'
$spec = Get-Specs
$json = $spec | ConvertTo-Json -Depth 6 -Compress

$gpuNames = @($spec.gpus | ForEach-Object { $_.name }) -join ' ; '
$diskStr  = @($spec.disks | ForEach-Object { "$($_.type) $($_.sizeGB)GB" }) -join ' ; '
$freeStr  = @($spec.volumes | ForEach-Object { "$($_.letter): free $($_.freeGB)GB" }) -join ' ; '
$ramInt   = if ($spec.ramGB) { [math]::Round($spec.ramGB) } else { '' }
$line = "GSC|CPU=$($spec.cpu.name)|GPU=$gpuNames|RAM=$ramInt|DISK=$diskStr|FREE=$freeStr|OS=$($spec.os.name)"

Write-Host ''
Write-Host "  CPU     : $($spec.cpu.name)"
Write-Host "  顯示卡  : $gpuNames"
Write-Host "  記憶體  : $($spec.ramGB) GB"
Write-Host "  硬碟    : $diskStr"
Write-Host "  剩餘    : $freeStr"
Write-Host "  系統    : $($spec.os.name)"
Write-Host ''
try { Set-Clipboard -Value $line; Write-Host '  下面這一行已複製到剪貼簿（也可以貼到網頁的「貼上指令結果」）：' -ForegroundColor DarkGray } catch { Write-Host '  可貼到網頁「貼上指令結果」的一行：' -ForegroundColor DarkGray }
Write-Host "  $line" -ForegroundColor DarkGray
Write-Host ''

# ---- 本機服務（只聽 127.0.0.1，外部連不到） ----
$listener = $null
foreach ($p in @($Port, $Port + 1, $Port + 2)) {
  try { $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p); $listener.Start(); $Port = $p; break } catch { $listener = $null }
}
if (-not $listener) {
  Write-Host '  無法開啟本機服務（連接埠被占用）。請改用上面那一行貼到網頁。' -ForegroundColor Yellow
  Read-Host '  按 Enter 結束' | Out-Null; exit
}
Write-Host "  小助手已就緒（127.0.0.1:$Port）。回到網頁按「一鍵檢測（本機小助手）」即可。" -ForegroundColor Green
if ($SiteUrl) {
  $sep = if ($SiteUrl.Contains('?')) { '&' } else { '?' }
  try { Start-Process ($SiteUrl + $sep + "helper=$Port") } catch {}
  Write-Host '  已為你開啟網頁；若沒有自動填入，請在網頁按「一鍵檢測（本機小助手）」。'
}
Write-Host "  檢測完成後直接關閉此視窗即可（閒置 $TimeoutMinutes 分鐘會自動結束）。"
Write-Host ''

$bytes = [Text.Encoding]::UTF8.GetBytes($json)
$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$bye = $false
while (-not $bye -and (Get-Date) -lt $deadline) {
  if (-not $listener.Pending()) { Start-Sleep -Milliseconds 120; continue }
  $client = $listener.AcceptTcpClient()
  try {
    $client.ReceiveTimeout = 3000; $client.SendTimeout = 3000
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [Text.Encoding]::ASCII)
    $reqLine = $reader.ReadLine()
    $headers = @{}
    while ($true) { $h = $reader.ReadLine(); if ($null -eq $h -or $h -eq '') { break }; $i = $h.IndexOf(':'); if ($i -gt 0) { $headers[$h.Substring(0, $i).Trim().ToLower()] = $h.Substring($i + 1).Trim() } }
    $parts = "$reqLine" -split ' '
    $method = $parts[0]; $path = if ($parts.Length -gt 1) { $parts[1] } else { '/' }
    $origin = if ($headers['origin']) { $headers['origin'] } else { '*' }
    $common = "Access-Control-Allow-Origin: $origin`r`nAccess-Control-Allow-Private-Network: true`r`nAccess-Control-Allow-Methods: GET, OPTIONS`r`nAccess-Control-Allow-Headers: *`r`nAccess-Control-Max-Age: 600`r`nVary: Origin`r`nCache-Control: no-store`r`nConnection: close`r`n"
    if ($method -eq 'OPTIONS') {
      $head = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 204 No Content`r`n$common`r`n"); $stream.Write($head, 0, $head.Length)
    } elseif ($path -like '/specs*') {
      $head = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`n$common`r`n")
      $stream.Write($head, 0, $head.Length); $stream.Write($bytes, 0, $bytes.Length)
      Write-Host "  $((Get-Date).ToString('HH:mm:ss')) 已把硬體資訊傳給網頁（$origin）" -ForegroundColor Green
    } elseif ($path -like '/bye*') {
      $head = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 200 OK`r`nContent-Length: 0`r`n$common`r`n"); $stream.Write($head, 0, $head.Length); $bye = $true
    } else {
      $head = [Text.Encoding]::ASCII.GetBytes("HTTP/1.1 404 Not Found`r`nContent-Length: 0`r`n$common`r`n"); $stream.Write($head, 0, $head.Length)
    }
    $stream.Flush()
  } catch {} finally { try { $client.Close() } catch {} }
}
try { $listener.Stop() } catch {}
Write-Host '  小助手已結束。'
