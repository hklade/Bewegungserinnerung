# Bewegungserinnerung React WebApp

Lokaler React/Vite-Prototyp fuer die Bewegungserinnerung.

## Starten

```bash
npm install
npm run dev
```

`npm run dev` startet ausschließlich den Vite-Frontend-Server; der API-Server (`server.mjs`) muss separat gestartet werden (`node server.mjs` oder `start.bat`) und läuft dabei immer gegen die Produktionsdaten (`config/bewegungserinnerung.config.json`, `data/Bewegungsdaten.csv`, `data/Trinkdaten.csv`), unabhängig von einem eventuell im Terminal gesetzten `NODE_ENV`.

Um die komplette App lokal gegen Testdaten laufen zu lassen (z. B. zum manuellen Ausprobieren, ohne die echten Daten zu berühren):

```bash
npm run dev:test
```

## Enthalten

- Reminder-Popup
- Tagesansicht
- Wochenansicht
- responsive Layout
- visuell an die vorherige HTML-Vorschau angelehnt

## CI & Testberichte

Jeder Push und jede Pull Request löst den Workflow `.github/workflows/test.yml` aus (Server-Tests + E2E-Suite). Der generierte Allure-Report wird unabhängig vom Testergebnis als Artefakt hochgeladen:

1. Auf der GitHub-Seite des jeweiligen Workflow-Laufs (Tab „Actions“) ganz nach unten zu „Artifacts“ scrollen.
2. `allure-report` herunterladen und entpacken.
3. `index.html` im Browser öffnen.

Artefakte werden 30 Tage aufbewahrt.

