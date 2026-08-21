import type { ChangeEvent, RefObject } from "react";

export function ImportExportPanel(props: {
  importState: "idle" | "importing" | "error";
  importFileInputRef: RefObject<HTMLInputElement | null>;
  onExportCsv: () => void;
  onOpenImportDialog: () => void;
  onImportFileSelected: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const {
    importState,
    importFileInputRef,
    onExportCsv,
    onOpenImportDialog,
    onImportFileSelected,
  } = props;

  return (
    <div className="activity-footer">
      <button className="secondary-btn" type="button" onClick={onExportCsv}>
        CSV-Daten exportieren
      </button>
      <button
        className="secondary-btn warning"
        type="button"
        onClick={onOpenImportDialog}
        disabled={importState === "importing"}
      >
        {importState === "importing"
          ? "Import läuft..."
          : "CSV-Daten importieren"}
      </button>
      <input
        ref={importFileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={onImportFileSelected}
        style={{ display: "none" }}
      />
    </div>
  );
}
