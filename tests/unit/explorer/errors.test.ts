import { afterEach, describe, expect, it, vi } from "vitest";
import { exploreErrorResponse } from "@/lib/explorer/errors";
import { PlacesError } from "@/lib/places/types";

afterEach(() => vi.restoreAllMocks());

describe("exploreErrorResponse", () => {
  it("maps auth to 502", async () => {
    const r = exploreErrorResponse(new PlacesError("auth", "x"));
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: "auth", message: "La clave de Google Maps no es válida" });
  });
  it("maps quota to 429", async () => {
    const r = exploreErrorResponse(new PlacesError("quota", "x"));
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ error: "quota", message: "Se ha superado la cuota de Google Maps" });
  });
  it("maps other places errors to 502", async () => {
    const r = exploreErrorResponse(new PlacesError("network", "x"));
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: "network", message: "Error al consultar Google Maps" });
  });
  it("maps anything else to 500 and logs", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = exploreErrorResponse(new Error("boom"));
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: "unknown", message: "Algo ha fallado. Inténtalo de nuevo." });
    expect(spy).toHaveBeenCalled();
  });
});
