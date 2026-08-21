import { describe, expect, it } from "vitest";
import {
  formatDate,
  normalizeDateKey,
  formatCalendarDate,
  getWeekdayIndex,
  formatCurrentDay,
  formatLocalIsoDate,
  getDayLabel,
  formatValueLabel,
  toneClassByValue,
  getTypeLabel,
} from "../../src/lib/formatting";
import type { ActivityItem } from "../../src/types";

function makeActivity(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 1,
    date: "2026-08-21",
    time: "08:55",
    plannedTime: "08:55",
    delayMinutes: 0,
    value: 2,
    description: "Spaziergang",
    note: "",
    entryType: "planned_break_response",
    isAdditionalBreak: false,
    ...overrides,
  };
}

describe("formatDate", () => {
  it("converts an ISO date to German day.month.year", () => {
    expect(formatDate("2026-08-21")).toBe("21.08.2026");
  });

  it("returns the input unchanged when it has no dash-separated parts", () => {
    expect(formatDate("notadate")).toBe("notadate");
  });
});

describe("normalizeDateKey", () => {
  it("keeps an ISO date as-is", () => {
    expect(normalizeDateKey("2026-08-21")).toBe("2026-08-21");
  });

  it("strips a time component from an ISO datetime", () => {
    expect(normalizeDateKey("2026-08-21T10:00:00")).toBe("2026-08-21");
  });

  it("converts a German-formatted date to ISO", () => {
    expect(normalizeDateKey("21.08.2026")).toBe("2026-08-21");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeDateKey("")).toBe("");
  });
});

describe("formatCalendarDate", () => {
  it("formats a Date object as day.month.year", () => {
    expect(formatCalendarDate(new Date(2026, 7, 21))).toBe("21.08.2026");
  });
});

describe("getWeekdayIndex", () => {
  it("maps Monday to index 0", () => {
    // 2026-08-17 is a Monday
    expect(getWeekdayIndex(new Date(2026, 7, 17))).toBe(0);
  });

  it("maps Sunday to index 6", () => {
    // 2026-08-16 is a Sunday
    expect(getWeekdayIndex(new Date(2026, 7, 16))).toBe(6);
  });
});

describe("formatCurrentDay", () => {
  it("combines German weekday name and calendar date", () => {
    expect(formatCurrentDay(new Date(2026, 7, 17))).toBe("Montag, 17.08.2026");
  });
});

describe("formatLocalIsoDate", () => {
  it("formats a Date as a local ISO date string", () => {
    expect(formatLocalIsoDate(new Date(2026, 7, 21))).toBe("2026-08-21");
  });
});

describe("getDayLabel", () => {
  it("combines weekday name and formatted date for an ISO day", () => {
    expect(getDayLabel("2026-08-17")).toBe("Montag, 17.08.2026");
  });
});

describe("formatValueLabel", () => {
  it("renders null as an em dash", () => {
    expect(formatValueLabel(null)).toBe("—");
  });

  it("renders integers without decimals", () => {
    expect(formatValueLabel(3)).toBe("3");
  });

  it("renders non-integers with one decimal", () => {
    expect(formatValueLabel(2.5)).toBe("2.5");
  });
});

describe("toneClassByValue", () => {
  it("returns red for null", () => {
    expect(toneClassByValue(null)).toBe("red");
  });

  it("returns green for values >= 4", () => {
    expect(toneClassByValue(4)).toBe("green");
  });

  it("returns blue for values >= 3 and < 4", () => {
    expect(toneClassByValue(3)).toBe("blue");
  });

  it("returns red for values below 1", () => {
    expect(toneClassByValue(0.5)).toBe("red");
  });
});

describe("getTypeLabel", () => {
  it("labels additional breaks as Zusatz regardless of other fields", () => {
    expect(getTypeLabel(makeActivity({ isAdditionalBreak: true }))).toBe("Zusatz");
  });

  it("labels planned break responses as Geplant", () => {
    expect(
      getTypeLabel(makeActivity({ entryType: "planned_break_response" })),
    ).toBe("Geplant");
  });

  it("labels entries with no value as Offen", () => {
    expect(
      getTypeLabel(makeActivity({ entryType: "unanswered", value: null })),
    ).toBe("Offen");
  });

  it("falls back to Eintrag", () => {
    expect(getTypeLabel(makeActivity({ entryType: "other", value: 1 }))).toBe(
      "Eintrag",
    );
  });
});
