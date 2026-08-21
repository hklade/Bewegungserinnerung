import { describe, expect, it } from "vitest";
import {
  getCurrentReminderSlot,
  getNextReminderCountdown,
} from "../../src/lib/reminderCountdown";
import type { AppConfig } from "../../src/types";

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    hourlyReminderEnabled: true,
    showReminderDialog: true,
    reminderStartTime: "07:55",
    reminderEndTime: "16:55",
    weekdaysOnly: true,
    exportPath: "",
    reminderToneEnabled: true,
    dailyDrinkLiters: 2,
    ...overrides,
  };
}

describe("getNextReminderCountdown", () => {
  it("returns null when hourly reminders are disabled", () => {
    const config = makeConfig({ hourlyReminderEnabled: false });
    expect(getNextReminderCountdown(new Date(2026, 7, 21, 9, 28), config)).toBeNull();
  });

  it("counts minutes to the next slot later the same day", () => {
    // Friday 2026-08-21, 09:28 -> next slot 09:55 -> 27 minutes
    const config = makeConfig();
    const now = new Date(2026, 7, 21, 9, 28);
    expect(now.getDay()).toBe(5); // sanity check: this is a Friday
    expect(getNextReminderCountdown(now, config)).toBe(27);
  });

  it("does not treat Friday as a weekend day (regression: reported bug)", () => {
    // Friday, before end time -> must NOT jump to Monday
    const config = makeConfig();
    const now = new Date(2026, 7, 21, 9, 28);
    const countdown = getNextReminderCountdown(now, config);
    expect(countdown).toBeLessThan(60);
  });

  it("counts minutes to tomorrow's first slot when past today's last slot", () => {
    // Monday 2026-08-17, 08:00 -> next slot 08:55 -> 55 minutes
    const config = makeConfig();
    const now = new Date(2026, 7, 17, 8, 0);
    expect(getNextReminderCountdown(now, config)).toBe(55);
  });

  it("skips the weekend correctly from Saturday to Monday's first slot", () => {
    // Saturday 2026-08-22, 10:00 -> Monday 2026-08-24, 07:55
    // rest of Saturday (840) + all of Sunday (1440) + until 07:55 Monday (475) = 2755
    const config = makeConfig();
    const now = new Date(2026, 7, 22, 10, 0);
    expect(getNextReminderCountdown(now, config)).toBe(2755);
  });

  it("skips the weekend correctly from Sunday night to Monday's first slot", () => {
    // Sunday 2026-08-23, 23:50 -> Monday 2026-08-24, 07:55 = 10 + 475 = 485
    const config = makeConfig();
    const now = new Date(2026, 7, 23, 23, 50);
    expect(getNextReminderCountdown(now, config)).toBe(485);
  });

  it("skips the weekend correctly from Friday evening to Monday's first slot", () => {
    // Friday 2026-08-21, 17:30 (after last slot) -> Monday 07:55
    // rest of Friday (390) + Saturday (1440) + Sunday (1440) + until 07:55 (475) = 3745
    const config = makeConfig();
    const now = new Date(2026, 7, 21, 17, 30);
    expect(getNextReminderCountdown(now, config)).toBe(3745);
  });

  it("does not skip weekends when weekdaysOnly is false", () => {
    // Saturday 2026-08-22, 10:00, weekdaysOnly=false -> next slot 10:55 same day
    const config = makeConfig({ weekdaysOnly: false });
    const now = new Date(2026, 7, 22, 10, 0);
    expect(getNextReminderCountdown(now, config)).toBe(55);
  });
});

describe("getCurrentReminderSlot", () => {
  it("returns the matching slot when now falls exactly on one", () => {
    const config = makeConfig();
    const now = new Date(2026, 7, 21, 9, 55);
    expect(getCurrentReminderSlot(now, config)).toBe("09:55");
  });

  it("returns null on a weekend when weekdaysOnly is true", () => {
    const config = makeConfig();
    const now = new Date(2026, 7, 22, 9, 55); // Saturday
    expect(getCurrentReminderSlot(now, config)).toBeNull();
  });

  it("returns null when no slot matches the current minute", () => {
    const config = makeConfig();
    const now = new Date(2026, 7, 21, 9, 56);
    expect(getCurrentReminderSlot(now, config)).toBeNull();
  });
});
