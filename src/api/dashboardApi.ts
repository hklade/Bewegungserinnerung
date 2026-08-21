import { apiBase } from "../constants.js";
import type { AppConfig, DashboardApi } from "../types.js";

export type CreateBookingPayload = {
  value: number;
  description: string;
  note: string;
  entryType: string;
};

async function requestOk(path: string, init?: RequestInit): Promise<Response> {
  const response = init
    ? await fetch(`${apiBase}${path}`, init)
    : await fetch(`${apiBase}${path}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response;
}

function jsonRequestInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

export async function fetchDashboard(limit: number): Promise<DashboardApi> {
  const response = await requestOk(`/dashboard?limit=${limit}`);
  return (await response.json()) as DashboardApi;
}

export async function createBooking(payload: CreateBookingPayload) {
  await requestOk("/bookings", jsonRequestInit("POST", payload));
}

export async function updateConfig(config: AppConfig): Promise<AppConfig> {
  const response = await requestOk("/config", jsonRequestInit("PUT", config));
  return (await response.json()) as AppConfig;
}

export async function importBookings(csvText: string) {
  await requestOk("/bookings/import", {
    method: "POST",
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
    },
    body: csvText,
  });
}

export async function exportBookingsCsv(): Promise<Blob> {
  const response = await requestOk("/bookings/export");
  return await response.blob();
}

export async function logHydration(nextMl: number) {
  await requestOk(
    "/bookings",
    jsonRequestInit("POST", {
      entryType: "hydration",
      value: nextMl,
      description: "Trinkmenge",
      note: `${nextMl} ml`,
    }),
  );
}
