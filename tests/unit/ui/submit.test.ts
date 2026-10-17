import { describe, expect, it } from "vitest";
import { SAVE_FAILED, safeSubmit } from "@/lib/ui/submit";

describe("safeSubmit", () => {
  it("passes through the action's result", async () => {
    expect(await safeSubmit(async () => null)).toBeNull();
    expect(await safeSubmit(async () => "Datos no válidos")).toBe("Datos no válidos");
  });

  it("turns a thrown action into a retryable error message", async () => {
    expect(SAVE_FAILED).toBe("No se pudo guardar. Inténtalo de nuevo.");
    expect(
      await safeSubmit(async () => {
        throw new Error("network");
      }),
    ).toBe(SAVE_FAILED);
  });
});
