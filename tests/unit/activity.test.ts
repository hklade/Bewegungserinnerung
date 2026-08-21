import { describe, expect, it } from "vitest";
import {
  isMissedReminderEntry,
  getEntryTime,
  getEntryHour,
  buildHourlyBars,
  buildDaySummary,
} from "../../src/lib/activity";
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

describe("isMissedReminderEntry", () => {
  it("treats unanswered entries as missed", () => {
    expect(isMissedReminderEntry(makeActivity({ entryType: "unanswered" }))).toBe(
      true,
    );
  });

  it("treats auto-filled zero-value planned entries as missed", () => {
    expect(
      isMissedReminderEntry(
        makeActivity({
          entryType: "planned_break_response",
          value: 0,
          description: "keine Aktivität eingetragen",
          note: "automatisch ergänzt",
        }),
      ),
    ).toBe(true);
  });

  it("does not treat a normal answered entry as missed", () => {
    expect(isMissedReminderEntry(makeActivity())).toBe(false);
  });
});

describe("getEntryTime", () => {
  it("prefers the explicit time field", () => {
    expect(getEntryTime(makeActivity({ time: "09:00", plannedTime: "08:00" }))).toBe(
      "09:00",
    );
  });

  it("falls back to plannedTime when time is empty", () => {
    expect(getEntryTime(makeActivity({ time: "", plannedTime: "08:00" }))).toBe(
      "08:00",
    );
  });

  it("falls back to a placeholder when nothing is available", () => {
    expect(getEntryTime(makeActivity({ time: "", plannedTime: "" }))).toBe(
      "--:--",
    );
  });
});

describe("getEntryHour", () => {
  it("rounds down to the top of the hour", () => {
    expect(getEntryHour(makeActivity({ time: "09:42" }))).toBe("09:00");
  });

  it("clamps out-of-range hours", () => {
    expect(getEntryHour(makeActivity({ time: "99:00" }))).toBe("23:00");
  });
});

describe("buildHourlyBars", () => {
  it("groups entries by hour and computes the average value", () => {
    const bars = buildHourlyBars([
      makeActivity({ id: 1, time: "09:10", value: 2 }),
      makeActivity({ id: 2, time: "09:40", value: 4 }),
      makeActivity({ id: 3, time: "10:05", value: 1 }),
    ]);

    expect(bars).toHaveLength(2);
    expect(bars[0]).toMatchObject({ hour: "09:00", count: 2, averageValue: 3 });
    expect(bars[1]).toMatchObject({ hour: "10:00", count: 1, averageValue: 1 });
  });

  it("excludes entries without a value that are not unanswered", () => {
    const bars = buildHourlyBars([
      makeActivity({ id: 1, time: "09:10", value: null, entryType: "planned_break_response" }),
    ]);

    expect(bars).toHaveLength(0);
  });

  it("includes unanswered entries even without a value", () => {
    const bars = buildHourlyBars([
      makeActivity({ id: 1, time: "09:10", value: null, entryType: "unanswered" }),
    ]);

    expect(bars).toHaveLength(1);
  });
});

describe("buildDaySummary", () => {
  it("aggregates totals, answered/unanswered counts and averages", () => {
    const summary = buildDaySummary([
      makeActivity({ id: 1, value: 2, delayMinutes: 10 }),
      makeActivity({ id: 2, value: 4, delayMinutes: 20 }),
      makeActivity({ id: 3, entryType: "unanswered", value: null, delayMinutes: 0 }),
      makeActivity({ id: 4, isAdditionalBreak: true, value: 3, delayMinutes: 0 }),
    ]);

    expect(summary.total).toBe(4);
    expect(summary.answered).toBe(3);
    expect(summary.unanswered).toBe(1);
    expect(summary.additional).toBe(1);
    expect(summary.averageValue).toBeCloseTo(3);
    expect(summary.averageDelayMinutes).toBeCloseTo(7.5);
  });

  it("returns null averages when there is nothing to average", () => {
    const summary = buildDaySummary([]);
    expect(summary.averageValue).toBeNull();
    expect(summary.averageDelayMinutes).toBeNull();
  });
});
