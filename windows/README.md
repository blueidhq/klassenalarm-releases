# Klassenalarm für Windows

Hier finden Sie die aktuelle Version von Klassenalarm für Windows-PCs mit x64-Prozessor. Für die Installation brauchen Sie keinen Zugriff auf den Microsoft Store.

<!-- download:start -->
## Version 1.0.15.0

Veröffentlicht am 21.09.2026

[Windows-Setup herunterladen](https://github.com/blueidhq/klassenalarm-releases/releases/download/windows/1.0.15.0/Klassenalarm-Setup-1.0.15.0.exe)

[MSIX-Bundle herunterladen](https://github.com/blueidhq/klassenalarm-releases/releases/download/windows/1.0.15.0/klassenalarm_1.0.15.0_x64.msixbundle)

[Windows-Paket mit Zertifikat und Abhängigkeiten herunterladen (ZIP)](https://github.com/blueidhq/klassenalarm-releases/releases/download/windows/1.0.15.0/klassenalarm-windows-1.0.15.0.zip)
<!-- download:end -->

## Installation mit dem Windows-Setup

> [!IMPORTANT]
> Für den Import des MSIX-Signaturzertifikats benötigt das Windows-Setup Administratorrechte. Wenn Sie die Windows-Abfrage auf Ihrem Gerät nicht bestätigen können, wenden Sie sich für die Installation an Ihre IT.

1. Laden Sie das Windows-Setup herunter und öffnen Sie die EXE-Datei in dem Windows-Konto, mit dem Sie Klassenalarm nutzen möchten.
2. Folgen Sie den Schritten im Setup.
3. Öffnen Sie nach der Installation Klassenalarm im Startmenü.

Das Setup bringt die Windows-Abhängigkeiten mit und installiert sie zusammen mit Klassenalarm.

## Installation des MSIX-Bundles durch die IT

Das MSIX-Bundle lässt sich einzeln installieren, wenn Windows dem Klassenalarm-Signaturzertifikat bereits vertraut und die passenden Laufzeitpakete vorhanden sind. Für die Ersteinrichtung enthält das ZIP alle benötigten Dateien.

1. Laden Sie das Windows-Paket als ZIP herunter und entpacken Sie es.
2. Erlauben Sie auf den Zielgeräten die Installation vertrauenswürdiger App-Pakete außerhalb des Stores. Stellen Sie das mitgelieferte `.cer`-Zertifikat im Zertifikatspeicher **Vertrauenswürdige Personen** des lokalen Computers bereit. [Microsoft-Anleitung zur Installation außerhalb des Stores](https://learn.microsoft.com/de-de/windows/application-management/sideload-apps-in-windows)
3. Öffnen Sie Windows PowerShell im entpackten Ordner unter dem Windows-Konto, das Klassenalarm verwenden soll. Installieren Sie das Bundle zusammen mit den Laufzeitpaketen aus `Dependencies\x64`.

   ```powershell
   $bundle = Get-ChildItem -Filter '*.msixbundle' -File
   $dependencies = Get-ChildItem -LiteralPath '.\Dependencies\x64' -File |
       Where-Object { $_.Extension -in '.appx', '.msix' }
   Add-AppxPackage -Path $bundle.FullName -DependencyPath $dependencies.FullName
   ```

4. Prüfen Sie, ob sich Klassenalarm über das Startmenü im vorgesehenen Windows-Konto öffnen lässt.

## Warum Windows das MSIX-Signaturzertifikat braucht

Die Setup-EXE ist mit einem Zertifikat signiert, das Microsoft für die BlueID GmbH ausgestellt hat. Das Setup installiert anschließend das MSIX-Bundle. Dieses Bundle hat eine eigene Signatur mit dem selbstsignierten Zertifikat, das dem ZIP beiliegt.

Windows prüft die Signatur des Bundles, um Änderungen am App-Paket nach der Signierung zu erkennen. Damit die Prüfung erfolgreich ist, muss der Computer dem mitgelieferten Zertifikat vertrauen. Das Setup importiert es nach der Administratorfreigabe. Bei der zentralen Verteilung kann Ihre IT das Zertifikat vorab auf den Zielgeräten hinterlegen.

Wenn Sie Unterstützung bei der Installation benötigen, wenden Sie sich bitte an Ihre Klassenalarm-Ansprechperson.
