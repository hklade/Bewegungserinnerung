from __future__ import annotations

import csv
import sqlite3
from datetime import datetime
from pathlib import Path

PROJECT = Path(r"C:\Users\HeidiKlade\OneDrive - Gofore Oyj\Projekte\Bewegungserinnerung")
CSV_PATH = Path(r"C:\Users\HeidiKlade\Downloads\bewegungspausen_export_alle_daten_bis_2026-07-06_korrigiert.csv")
DB_PATH = PROJECT / "data" / "bewegungserinnerung.sqlite3"


def as_int(value: str | None) -> int | None:
    text = (value or "").strip()
    if not text:
        return None
    return int(text)


def as_text(value: str | None) -> str | None:
    text = (value or "").strip()
    return text or None


def weekday_for(date_text: str) -> str:
    return datetime.strptime(date_text.strip(), "%Y-%m-%d").strftime("%A")


def infer_entry_type(row: dict[str, str]) -> str:
    flag = (row.get("is_additional_break") or "").strip().lower()
    if flag in {"true", "1", "yes", "y"}:
        return "additional_break"
    rating = (row.get("rating") or "").strip()
    if not rating:
        return "unanswered"
    return "planned_break_response"


def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute(
            """
            CREATE TABLE movement_pause_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                weekday TEXT NOT NULL,
                entry_type TEXT NOT NULL,
                reminder_time TEXT,
                response_time TEXT,
                delay_minutes INTEGER,
                value INTEGER,
                description TEXT,
                source_rating INTEGER,
                source_activity TEXT,
                source_duration_minutes INTEGER,
                source_is_additional_break INTEGER,
                source_note TEXT,
                source_csv_row INTEGER NOT NULL,
                imported_at TEXT NOT NULL
            );
            """
        )

        with CSV_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle, delimiter=";")
            rows = []
            for index, row in enumerate(reader, start=2):
                date_text = (row.get("date") or "").strip()
                if not date_text:
                    continue
                activity = as_text(row.get("activity"))
                note = as_text(row.get("note"))
                rows.append(
                    (
                        date_text,
                        weekday_for(date_text),
                        infer_entry_type(row),
                        as_text(row.get("reminder_time")),
                        as_text(row.get("response_time")),
                        as_int(row.get("delay_minutes")),
                        as_int(row.get("rating")),
                        activity,
                        as_int(row.get("rating")),
                        activity,
                        as_int(row.get("duration_minutes")),
                        1 if (row.get("is_additional_break") or "").strip().lower() in {"true", "1", "yes", "y"} else 0,
                        note,
                        index,
                        datetime.now().isoformat(timespec="seconds"),
                    )
                )

        conn.executemany(
            """
            INSERT INTO movement_pause_entries (
                date, weekday, entry_type, reminder_time, response_time, delay_minutes,
                value, description, source_rating, source_activity, source_duration_minutes,
                source_is_additional_break, source_note, source_csv_row, imported_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            rows,
        )
        conn.commit()
        print(f"Imported {len(rows)} rows into {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
