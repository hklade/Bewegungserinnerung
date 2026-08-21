import { useState } from "react";
import type { FormEvent } from "react";
import { updateConfig } from "../api/dashboardApi.js";
import type { AppConfig } from "../types.js";

export function useConfigForm(options: {
  editableConfig: AppConfig;
  setConfigForm: (value: AppConfig) => void;
  refreshDashboard: () => Promise<void>;
}) {
  const { editableConfig, setConfigForm, refreshDashboard } = options;
  const [configState, setConfigState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  async function handleConfigSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setConfigState("saving");
    try {
      const payload = await updateConfig(editableConfig);
      setConfigForm(payload);
      setConfigState("saved");
      await refreshDashboard();
      window.setTimeout(() => {
        setConfigState("idle");
      }, 1500);
    } catch {
      setConfigState("error");
    }
  }

  return { configState, handleConfigSubmit };
}
