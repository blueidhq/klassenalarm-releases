# Klassenalarm mit Microsoft Intune verteilen

Entpacken Sie das Intune-Paket auf Ihrem Verwaltungsrechner. Die Datei `Klassenalarm.intunewin` ist für den Upload vorbereitet. Sie enthält die Windows-App, ihr Signaturzertifikat, die x64-Laufzeitpakete und die Installationsskripte. Dieselben Dateien liegen im Ordner `Paket` zur Einsicht und für andere Verwaltungssysteme bereit.

## Win32-App anlegen

1. Wählen Sie im Intune Admin Center unter **Apps → Windows → Erstellen** den Typ **Windows-App (Win32)**. Laden Sie `Klassenalarm.intunewin` hoch. Tragen Sie als Namen **Klassenalarm** und als Herausgeber **BlueID GmbH** ein.
2. Wählen Sie unter **Programm** die Eingabe per Befehlszeile. Verwenden Sie die folgenden Einstellungen.

   | Einstellung | Wert |
   | --- | --- |
   | Installationsbefehl | `Deploy.cmd install` |
   | Deinstallationsbefehl | `Deploy.cmd uninstall` |
   | Installationsverhalten | System |
   | Geräteanforderungen | x64 und eine von Ihrer IT unterstützte Windows-Version ab Windows 10, Version 1809 |

3. Wählen Sie unter **Erkennungsregeln** ein **benutzerdefiniertes Erkennungsskript** und laden Sie `Paket\Detect-Klassenalarm.ps1` aus demselben ZIP hoch. Setzen Sie die Ausführung als 32-Bit-Prozess auf **Nein**. Die mitgelieferten PowerShell-Skripte sind unsigniert. Falls Ihre Organisation signierte Skripte voraussetzt, signieren Sie diese nach Ihrem IT-Verfahren und verpacken Sie den Ordner `Paket` erneut mit dem [Microsoft Win32 Content Prep Tool](https://learn.microsoft.com/de-de/intune/app-management/deployment/create-win32-package).
4. Weisen Sie die App zunächst einer kleinen **Gerätegruppe** als **Erforderlich** zu. Die Geräte müssen die Installation vertrauenswürdiger App-Pakete außerhalb des Stores zulassen.

## Installation auf dem Testgerät prüfen

Intune installiert im Systemkontext. Das Skript importiert das mitgelieferte Zertifikat bei Bedarf in **Vertrauenswürdige Personen** des lokalen Computers und stellt die App mit ihren Abhängigkeiten für alle Windows-Konten bereit. Die Mitarbeitenden brauchen dafür keine lokalen Administratorrechte.

Intune meldet die Installation als erfolgreich, sobald Windows diese oder eine neuere Version für das Gerät bereitgestellt hat. Melden Sie sich am Testgerät ab und mit einem Standardkonto wieder an. Öffnen Sie Klassenalarm über das Startmenü. Anschließend können Sie die Zuweisung auf weitere Geräte ausweiten.

## Updates und Deinstallation

Legen Sie für ein Update eine neue Win32-App mit der neuen `.intunewin`-Datei und dem zugehörigen Erkennungsskript an. Wählen Sie unter **Ablösung** die bisherige Klassenalarm-App und stellen Sie **Vorherige Version deinstallieren** auf **Nein**. Weisen Sie die neue Version der gewünschten Gerätegruppe zu.

Eine Zuweisung zur **Deinstallation** entfernt Klassenalarm für alle Windows-Konten des Geräts. Das betrifft auch lokale App-Daten und manuell oder über den Store installierte Kopien mit derselben Paketidentität. Die Windows-Laufzeitpakete und das Zertifikat bleiben auf dem Gerät.

Weitere Angaben zu den Einstellungen finden Sie bei [Microsoft Learn zur Verteilung von Win32-Apps](https://learn.microsoft.com/de-de/intune/app-management/deployment/add-win32).
