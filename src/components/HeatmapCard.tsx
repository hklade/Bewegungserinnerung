import { formatValueLabel, toneClassByValue } from "../lib/formatting.js";
import type { HeatmapData } from "../types.js";

export function HeatmapCard(props: { heatmap: HeatmapData | undefined }) {
  if (!props.heatmap) {
    return <div className="empty-state">Heatmap wird geladen.</div>;
  }

  const gridStyle = {
    gridTemplateColumns: `64px repeat(${props.heatmap.columns.length}, minmax(40px, 1fr))`,
  } as const;

  return (
    <div className="heatmap-card">
      <div className="heatmap-nav">
        <button
          type="button"
          className="ghost-arrow"
          aria-label="Vorherige Daten"
        >
          ←
        </button>
        <div className="heatmap-title">
          <strong>{props.heatmap.title}</strong>
          <span>{props.heatmap.note}</span>
        </div>
        <button
          type="button"
          className="ghost-arrow"
          aria-label="Nächste Daten"
        >
          →
        </button>
      </div>

      <div className="heatmap-note">{props.heatmap.note}</div>

      <div className="heatmap-grid" style={gridStyle}>
        <div className="heatmap-corner" />
        {props.heatmap.columns.map((column) => (
          <div className="heatmap-column-head" key={column.date}>
            <strong>{column.label}</strong>
            <span>{column.shortLabel}</span>
          </div>
        ))}

        {props.heatmap.rows.map((row) => (
          <div className="heatmap-row" key={row.slot}>
            <div className="heatmap-row-label">{row.slot}</div>
            {row.cells.map((cell) => (
              <div
                key={`${cell.date}-${cell.slot}`}
                className={
                  cell.value === null
                    ? "heatmap-cell empty"
                    : `heatmap-cell tone-${toneClassByValue(cell.value)} intensity-${Math.min(4, Math.max(1, Math.round(cell.value)))}`
                }
              >
                <span>
                  {cell.value === null ? "·" : formatValueLabel(cell.value)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
