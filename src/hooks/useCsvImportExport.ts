import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { importBookings, exportBookingsCsv } from "../api/dashboardApi.js";

export function useCsvImportExport(options: {
  refreshDashboard: () => Promise<void>;
}) {
  const { refreshDashboard } = options;
  const [importState, setImportState] = useState<
    "idle" | "importing" | "error"
  >("idle");
  const importFileInputRef = useRef<HTMLInputElement | null>(null);

  function openImportDialog() {
    importFileInputRef.current?.click();
  }

  async function handleImportFileSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      window.alert("Bitte eine CSV-Datei auswählen.");
      return;
    }

    const confirmed = window.confirm(
      `Achtung: Beim Import werden alle aktuellen Daten gelöscht und durch die ausgewählte CSV-Datei ersetzt.\n\nDatei: ${file.name}\n\nFortfahren?`,
    );
    if (!confirmed) {
      return;
    }

    setImportState("importing");
    try {
      await importBookings(await file.text());

      try {
        await refreshDashboard();
      } catch {
        // The import already succeeded; keep the UI usable even if the follow-up refresh fails.
      }
    } catch {
      setImportState("error");
      return;
    }

    setImportState("idle");
  }

  async function handleExportCsv() {
    try {
      const csv = await exportBookingsCsv();
      const url = URL.createObjectURL(csv);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Bewegungsdaten.csv";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      // keep quiet; export is optional
    }
  }

  return {
    importState,
    importFileInputRef,
    openImportDialog,
    handleImportFileSelected,
    handleExportCsv,
  };
}
