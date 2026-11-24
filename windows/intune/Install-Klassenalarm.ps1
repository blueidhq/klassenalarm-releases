#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
try {
    $detect = Join-Path $PSScriptRoot 'Detect-Klassenalarm.ps1'
    & $detect
    if ($LASTEXITCODE -eq 0) { exit 0 }
    if ($LASTEXITCODE -ne 1) { throw 'Cannot determine the installed version.' }

    $release = Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'release.json') | ConvertFrom-Json
    foreach ($file in $release.files) {
        $path = Join-Path $PSScriptRoot $file.path
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $file.sha256) {
            throw "File does not match the Windows release: $($file.path)"
        }
    }

    $certPath = Join-Path $PSScriptRoot $release.certificate
    $certificate = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($certPath)
    if (-not (Test-Path -LiteralPath "Cert:\LocalMachine\TrustedPeople\$($certificate.Thumbprint)")) {
        Import-Certificate -FilePath $certPath -CertStoreLocation 'Cert:\LocalMachine\TrustedPeople' | Out-Null
    }

    $dependencies = foreach ($file in $release.dependencies) { Join-Path $PSScriptRoot $file }
    $provisioned = Add-AppxProvisionedPackage -Online -SkipLicense -Regions 'all' `
        -PackagePath (Join-Path $PSScriptRoot $release.bundle) -DependencyPackagePath $dependencies
    & $detect
    if ($LASTEXITCODE -ne 0) { throw 'Windows did not report the expected provisioned version.' }
    if ($provisioned.RestartNeeded) { exit 3010 }
    exit 0
} catch {
    [Console]::Error.WriteLine("Klassenalarm installation failed: $_")
    exit 1
}
