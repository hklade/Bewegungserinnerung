import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchDashboard,
  createBooking,
  updateConfig,
  importBookings,
  exportBookingsCsv,
  logHydration,
} from "../../src/api/dashboardApi";
import type { AppConfig } from "../../src/types";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

const sampleConfig: AppConfig = {
  hourlyReminderEnabled: true,
  showReminderDialog: true,
  reminderStartTime: "07:55",
  reminderEndTime: "16:55",
  weekdaysOnly: true,
  exportPath: "C:\\export\\Bewegungsdaten.csv",
  reminderToneEnabled: true,
  dailyDrinkLiters: 2,
};

describe("dashboardApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fetchDashboard", () => {
    it("requests the dashboard endpoint with a limit and returns the parsed payload", async () => {
      const payload = { total: 3 };
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(payload));

      const result = await fetchDashboard(200);

      expect(fetch).toHaveBeenCalledWith("/api/dashboard?limit=200");
      expect(result).toEqual(payload);
    });

    it("throws when the response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false, 500));

      await expect(fetchDashboard(200)).rejects.toThrow("HTTP 500");
    });
  });

  describe("createBooking", () => {
    it("posts the booking payload as JSON", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}));

      await createBooking({
        value: 2,
        description: "Spaziergang",
        note: "Spaziergang",
        entryType: "planned_break_response",
      });

      expect(fetch).toHaveBeenCalledWith("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: 2,
          description: "Spaziergang",
          note: "Spaziergang",
          entryType: "planned_break_response",
        }),
      });
    });

    it("throws when the response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false, 400));

      await expect(
        createBooking({
          value: 1,
          description: "x",
          note: "x",
          entryType: "planned_break_response",
        }),
      ).rejects.toThrow("HTTP 400");
    });
  });

  describe("updateConfig", () => {
    it("puts the config and returns the parsed response", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(sampleConfig));

      const result = await updateConfig(sampleConfig);

      expect(fetch).toHaveBeenCalledWith("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sampleConfig),
      });
      expect(result).toEqual(sampleConfig);
    });

    it("throws when the response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false, 422));

      await expect(updateConfig(sampleConfig)).rejects.toThrow("HTTP 422");
    });
  });

  describe("importBookings", () => {
    it("posts the CSV text with the correct content type", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}));

      await importBookings("id;date\n1;2026-08-21");

      expect(fetch).toHaveBeenCalledWith("/api/bookings/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv; charset=utf-8" },
        body: "id;date\n1;2026-08-21",
      });
    });

    it("throws when the response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false, 500));

      await expect(importBookings("csv")).rejects.toThrow("HTTP 500");
    });
  });

  describe("exportBookingsCsv", () => {
    it("returns the response blob", async () => {
      const blob = new Blob(["csv"], { type: "text/csv" });
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: async () => blob,
      } as Response);

      const result = await exportBookingsCsv();

      expect(fetch).toHaveBeenCalledWith("/api/bookings/export");
      expect(result).toBe(blob);
    });

    it("throws when the response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        blob: async () => new Blob(),
      } as Response);

      await expect(exportBookingsCsv()).rejects.toThrow("HTTP 500");
    });
  });

  describe("logHydration", () => {
    it("posts a hydration booking with the given amount", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}));

      await logHydration(500);

      expect(fetch).toHaveBeenCalledWith("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "hydration",
          value: 500,
          description: "Trinkmenge",
          note: "500 ml",
        }),
      });
    });

    it("throws when the response is not ok", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, false, 500));

      await expect(logHydration(250)).rejects.toThrow("HTTP 500");
    });
  });
});
