# Bewegungserinnerung React WebApp

Lokaler React/Vite-Prototyp fuer die Bewegungserinnerung.

## Starten

```bash
npm install
npm run dev
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

