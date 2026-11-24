#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
$family = 'BlueID.Klassenalarm_frdj7vb8tmanc'

function Get-RegisteredKlassenalarm($packageType) {
    Get-AppxPackage -AllUsers -Name 'BlueID.Klassenalarm' -PackageTypeFilter $packageType |
        Where-Object {
            $_.PackageFamilyName -eq $family -and
            $_.PackageUserInformation.InstallState -contains 'Installed'
        }
}

try {
    # Remove parent bundles first. Query again for any stand-alone main packages.
    foreach ($type in 'Bundle', 'Main') {
        foreach ($package in (Get-RegisteredKlassenalarm $type)) {
            Remove-AppxPackage -AllUsers -Package $package.PackageFullName
        }
    }
    if (Get-RegisteredKlassenalarm @('Bundle', 'Main')) {
        throw 'Windows still reports a registered copy of Klassenalarm.'
    }

    $restartNeeded = $false
    $provisionedPattern = $family.Replace('_', '_*_')
    $provisioned = Get-AppxProvisionedPackage -Online | Where-Object { $_.PackageName -like $provisionedPattern }
    foreach ($package in $provisioned) {
        $removal = Remove-AppxProvisionedPackage -Online -PackageName $package.PackageName
        $restartNeeded = $restartNeeded -or $removal.RestartNeeded
    }
    if (Get-AppxProvisionedPackage -Online | Where-Object { $_.PackageName -like $provisionedPattern }) {
        throw 'Windows still reports a provisioned copy of Klassenalarm.'
    }
    if ($restartNeeded) { exit 3010 }
    exit 0
} catch {
    [Console]::Error.WriteLine("Klassenalarm removal failed: $_")
    exit 1
}
