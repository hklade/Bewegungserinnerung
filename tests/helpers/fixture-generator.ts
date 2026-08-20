import { getViennaIsoDate, getViennaWeekday } from "../../server/utils/time.mjs";

const CSV_HEADER = [
  "id",
  "date",
  "weekday",
  "reminder_time",
  "response_time",
  "delay_minutes",
  "value",
  "description",
  "duration_minutes",
  "is_additional_break",
  "entry_type",
  "note",
  "created_at",
].join(";");

const ACTIVITY_DESCRIPTIONS = [
  "Kniebeugen",
  "Spaziergang",
  "Dehnen",
  "Schulterkreisen",
  "Armkreisen",
  "Liegestütz",
];

function addMinutes(totalMinutes: number, offset: number) {
  return ((totalMinutes + offset) % 1440 + 1440) % 1440;
}

function formatTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = String(Math.floor(normalized / 60)).padStart(2, "0");
  const minutes = String(normalized % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function parseTimeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function isWeekend(date: Date) {
  const weekdayIndex = (date.getDay() + 6) % 7;
  return weekdayIndex === 5 || weekdayIndex === 6;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Erzeugt CSV-Bewegungsdaten für die letzten `dayCount` Werktage vor `referenceDate`
 * (heute exklusiv), mit stündlichen Reminder-Slots ab `reminderStartTime`. Pro Slot
 * entsteht entweder ein beantworteter Eintrag (delay_minutes konsistent zur
 * Antwortzeit), gelegentlich ein zweiter zusätzlicher Eintrag, oder — für absichtlich
 * ausgelassene Slots — ein "automatisch ergänzt"-Backfill-Eintrag, wie ihn
 * ensureAutomaticReminderEntries()/buildMissedActivityEntries() in server/service.mjs
 * für tatsächlich verstrichene, unbeantwortete Slots erzeugen.
 *
 * Deckt bewusst nur vergangene Tage ab: der Server generiert Backfill-Einträge nur für
 * das heutige Datum, sodass historische Tage nicht nachträglich durch einen weiteren
 * Dashboard-Aufruf verändert werden — das ist die Voraussetzung für deterministische
 * Testerwartungen (siehe Issue #1).
 */
export function generateMovementCsv(options: {
  reminderStartTime: string;
  dayCount?: number;
  referenceDate?: Date;
  seed?: number;
}) {
  const { reminderStartTime, dayCount = 6, referenceDate = new Date(), seed = 1 } = options;
  const startMinutes = parseTimeToMinutes(reminderStartTime);
  const random = mulberry32(seed);

  const rows: string[] = [];
  let visibleRowCount = 0;
  let nextId = 1;
  let cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  let daysGenerated = 0;

  while (daysGenerated < dayCount) {
    cursor.setDate(cursor.getDate() - 1);

    if (isWeekend(cursor)) {
      continue;
    }

    const dateIso = getViennaIsoDate(cursor);
    const weekday = getViennaWeekday(cursor);

    for (let slotMinutes = startMinutes; slotMinutes <= startMinutes + 8 * 60; slotMinutes += 60) {
      const reminderTime = formatTime(slotMinutes);
      const skipSlot = random() < 0.2;

      if (skipSlot) {
        rows.push(
          [
            nextId++,
            dateIso,
            weekday,
            reminderTime,
            "",
            "",
            0,
            "keine Aktivität eingetragen",
            "",
            "false",
            "planned_break_response",
            "automatisch ergänzt",
            `${dateIso}T${reminderTime}:00.000Z`,
          ].join(";"),
        );
        visibleRowCount += 1;
        continue;
      }

      const delayMinutes = 1 + Math.floor(random() * 20);
      const responseMinutes = addMinutes(slotMinutes, delayMinutes);
      const responseTime = formatTime(responseMinutes);
      const description = ACTIVITY_DESCRIPTIONS[Math.floor(random() * ACTIVITY_DESCRIPTIONS.length)];
      const value = 1 + Math.floor(random() * 4);

      rows.push(
        [
          nextId++,
          dateIso,
          weekday,
          reminderTime,
          responseTime,
          delayMinutes,
          value,
          description,
          "",
          "false",
          "planned_break_response",
          description,
          `${dateIso}T${responseTime}:00.000Z`,
        ].join(";"),
      );
      visibleRowCount += 1;

      const extraEntry = random() < 0.15;
      if (extraEntry) {
        const extraDelay = delayMinutes + 1 + Math.floor(random() * 10);
        const extraMinutes = addMinutes(slotMinutes, extraDelay);
        const extraTime = formatTime(extraMinutes);
        const extraDescription = ACTIVITY_DESCRIPTIONS[Math.floor(random() * ACTIVITY_DESCRIPTIONS.length)];
        const extraValue = 1 + Math.floor(random() * 4);

        rows.push(
          [
            nextId++,
            dateIso,
            weekday,
            reminderTime,
            extraTime,
            extraDelay,
            extraValue,
            extraDescription,
            "",
            "true",
            "additional_break",
            extraDescription,
            `${dateIso}T${extraTime}:00.000Z`,
          ].join(";"),
        );
        visibleRowCount += 1;
      }
    }

    daysGenerated += 1;
  }

  return { csv: `${CSV_HEADER}\n${rows.join("\n")}\n`, visibleRowCount };
}
