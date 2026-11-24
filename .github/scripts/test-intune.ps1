# Integration test on a disposable GitHub-hosted Windows runner.
param([Parameter(Mandatory)][string]$Payload)

$ErrorActionPreference = 'Stop'
$Payload = (Resolve-Path $Payload).Path
$release = Get-Content -Raw -LiteralPath (Join-Path $Payload 'release.json') | ConvertFrom-Json
$bundle = Join-Path $Payload $release.bundle
$certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new((Join-Path $Payload $release.certificate))

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Security
$archive = [IO.Compression.ZipFile]::OpenRead($bundle)
try {
    $stream = $archive.GetEntry('AppxSignature.p7x').Open()
    $bytes = [IO.MemoryStream]::new()
    $stream.CopyTo($bytes)
    $signature = $bytes.ToArray()
    $cms = [System.Security.Cryptography.Pkcs.SignedCms]::new()
    $cms.Decode([byte[]]$signature[4..($signature.Length - 1)])
    $cms.CheckSignature($true)
    if ($cms.SignerInfos.Count -ne 1 -or $cms.SignerInfos[0].Certificate.Thumbprint -ne $certificate.Thumbprint) {
        throw 'Bundled certificate differs from the MSIX signer.'
    }
} finally {
    $archive.Dispose()
}

function Test-Detection($expectedExit) {
    $output = & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File (Join-Path $Payload 'Detect-Klassenalarm.ps1')
    if ($LASTEXITCODE -ne $expectedExit -or [bool]$output -ne ($expectedExit -eq 0)) {
        throw "Unexpected detection result (expected $expectedExit, got $LASTEXITCODE): $output"
    }
    Write-Host "Detection returned $expectedExit with the expected output."
}

function Test-SystemCommand($command, $expectedExit = 0) {
    # Intune launches Win32 commands from a 32-bit process as LocalSystem.
    $name = "Klassenalarm-CI-$([guid]::NewGuid())"
    $log = Join-Path $env:RUNNER_TEMP "$name.log"
    $action = New-ScheduledTaskAction -Execute "$env:SystemRoot\SysWOW64\cmd.exe" -Argument "/d /c Deploy.cmd $command > `"$log`" 2>&1" -WorkingDirectory $Payload
    Register-ScheduledTask -TaskName $name -User 'SYSTEM' -RunLevel Highest -Action $action | Out-Null
    try {
        Start-ScheduledTask -TaskName $name
        $deadline = (Get-Date).AddMinutes(5)
        do {
            Start-Sleep -Seconds 2
            $info = Get-ScheduledTaskInfo -TaskName $name
            $state = (Get-ScheduledTask -TaskName $name).State
            if ((Get-Date) -gt $deadline) { throw "$command timed out" }
        } until ($state -eq 'Ready' -and $info.LastRunTime.Year -gt 2000)
        if (Test-Path $log) { Get-Content -LiteralPath $log | Write-Host }
        if ($info.LastTaskResult -ne $expectedExit) {
            throw "$command returned $($info.LastTaskResult), expected $expectedExit"
        }
        Write-Host "SYSTEM $command returned $expectedExit."
    } finally {
        Unregister-ScheduledTask -TaskName $name -Confirm:$false
    }
}

Test-Detection 1
$certPath = Join-Path $Payload $release.certificate
$certBytes = [IO.File]::ReadAllBytes($certPath)
try {
    [IO.File]::WriteAllBytes($certPath, [byte[]](0))
    Test-SystemCommand 'install' 1
    Test-Detection 1
} finally {
    [IO.File]::WriteAllBytes($certPath, $certBytes)
}
Test-SystemCommand 'install'
Test-Detection 0
Test-SystemCommand 'install'
# Register for a real, second account (the runner) before exercising all-user removal.
$dependencies = foreach ($name in $release.dependencies) { Join-Path $Payload $name }
Add-AppxPackage -Path $bundle -DependencyPath $dependencies
if (-not (Get-AppxPackage -Name 'BlueID.Klassenalarm')) { throw 'Current user registration missing.' }
Test-SystemCommand 'uninstall'
Test-Detection 1
if (Get-AppxPackage -Name 'BlueID.Klassenalarm') { throw 'Current user registration survived removal.' }
Test-SystemCommand 'uninstall'
if (-not (Test-Path "Cert:\LocalMachine\TrustedPeople\$($certificate.Thumbprint)")) {
    throw 'Uninstall removed the shared signing certificate.'
}
# The final negative detection is expected to exit 1. Return the suite result to CI.
exit 0
