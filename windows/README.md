# Klassenalarm für Windows

Hier finden Sie die aktuelle Version von Klassenalarm für Windows-PCs mit x64-Prozessor. Für die Installation brauchen Sie keinen Zugriff auf den Microsoft Store.

<!-- download:start -->
## Version 1.0.15.0

Veröffentlicht am 21.09.2026

[Windows-Setup herunterladen](https://github.com/blueidhq/klassenalarm-releases/releases/download/windows/1.0.15.0/Klassenalarm-Setup-1.0.15.0.exe)

[MSIX-Bundle herunterladen](https://github.com/blueidhq/klassenalarm-releases/releases/download/windows/1.0.15.0/klassenalarm_1.0.15.0_x64.msixbundle)

[Windows-Paket mit Zertifikat und Abhängigkeiten herunterladen (ZIP)](https://github.com/blueidhq/klassenalarm-releases/releases/download/windows/1.0.15.0/klassenalarm-windows-1.0.15.0.zip)

[Intune-Paket mit Skripten und Anleitung herunterladen (ZIP)](https://github.com/blueidhq/klassenalarm-releases/releases/download/windows/1.0.15.0/klassenalarm-intune-1.0.15.0.zip)
<!-- download:end -->

## Installation mit dem Windows-Setup

> [!IMPORTANT]
> Für den Import des MSIX-Signaturzertifikats benötigt das Windows-Setup Administratorrechte. Wenn Sie die Windows-Abfrage auf Ihrem Gerät nicht bestätigen können, wenden Sie sich für die Installation an Ihre IT.

1. Laden Sie das Windows-Setup herunter und öffnen Sie die EXE-Datei in dem Windows-Konto, mit dem Sie Klassenalarm nutzen möchten.
2. Folgen Sie den Schritten im Setup.
3. Öffnen Sie nach der Installation Klassenalarm im Startmenü.

Das Setup importiert das Zertifikat und installiert Klassenalarm samt Windows-Abhängigkeiten. Damit ist die Installation abgeschlossen.

## Verteilung über Microsoft Intune

Für zentral verwaltete Geräte enthält das Intune-Paket eine fertige `.intunewin`-Datei. Laden Sie diese als Windows-App (Win32) in Intune hoch. Als Erkennungsregel verwenden Sie `Paket\Detect-Klassenalarm.ps1` aus demselben ZIP. Die Befehle für Installation und Deinstallation sowie die Einstellungen für die Zuweisung finden Sie in der [Intune-Anleitung](intune/README.md).

## Installation des MSIX-Bundles durch die IT

Laden Sie für die Ersteinrichtung das Windows-Paket als ZIP herunter und entpacken Sie es. Es enthält das MSIX-Bundle, das Signaturzertifikat und die Windows-Abhängigkeiten. Wenn Windows dem Zertifikat bereits vertraut und die passenden Laufzeitpakete installiert sind, genügt das einzelne MSIX-Bundle.

### Zertifikat als vertrauenswürdig hinterlegen

> [!IMPORTANT]
> Bei der Erstinstallation muss das Zertifikat einmal pro Gerät mit Administratorrechten hinterlegt werden, sofern Windows ihm noch nicht vertraut. Updates mit demselben Zertifikat nutzen den vorhandenen Eintrag.

1. Öffnen Sie im Startmenü **Windows PowerShell** über **Als Administrator ausführen**. Wechseln Sie mit `Set-Location` in den entpackten Ordner.
2. Importieren Sie `klassenalarm-prod-signing.cer` in den Zertifikatspeicher **Vertrauenswürdige Personen** des lokalen Computers.

   ```powershell
   Import-Certificate -FilePath '.\klassenalarm-prod-signing.cer' -CertStoreLocation 'Cert:\LocalMachine\TrustedPeople'
   ```

3. Schließen Sie nach dem erfolgreichen Import das Administratorfenster.

### App und Abhängigkeiten installieren

1. Stellen Sie sicher, dass die Zielgeräte die Installation vertrauenswürdiger App-Pakete außerhalb des Stores zulassen. [Microsoft-Anleitung zur Installation außerhalb des Stores](https://learn.microsoft.com/de-de/windows/application-management/sideload-apps-in-windows)
2. Öffnen Sie Windows PowerShell im entpackten Ordner unter dem Windows-Konto, das Klassenalarm verwenden soll. Installieren Sie das Bundle zusammen mit den Laufzeitpaketen aus `Dependencies\x64`.

   ```powershell
   $bundle = Get-ChildItem -Filter '*.msixbundle' -File
   $dependencies = Get-ChildItem -LiteralPath '.\Dependencies\x64' -File |
       Where-Object { $_.Extension -in '.appx', '.msix' }
   Add-AppxPackage -Path $bundle.FullName -DependencyPath $dependencies.FullName
   ```

3. Prüfen Sie, ob sich Klassenalarm über das Startmenü im vorgesehenen Windows-Konto öffnen lässt.

## Warum Windows das MSIX-Signaturzertifikat braucht

Die Setup-EXE ist mit einem Zertifikat signiert, das Microsoft für die BlueID GmbH ausgestellt hat. Das Setup installiert anschließend das MSIX-Bundle. Dieses Bundle hat eine eigene Signatur mit dem selbstsignierten Zertifikat, das dem ZIP beiliegt.

Windows prüft die Signatur des Bundles, um Änderungen am App-Paket nach der Signierung zu erkennen. Damit die Prüfung erfolgreich ist, muss der Computer dem mitgelieferten Zertifikat vertrauen. Das Setup importiert es nach der Administratorfreigabe. Bei der zentralen Verteilung kann Ihre IT das Zertifikat vorab auf den Zielgeräten hinterlegen.

Wenn Sie Unterstützung bei der Installation benötigen, wenden Sie sich bitte an Ihre Klassenalarm-Ansprechperson.
