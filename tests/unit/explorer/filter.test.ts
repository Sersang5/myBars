import { describe, expect, it } from "vitest";
import { filterCandidates } from "@/lib/explorer/filter";
import { summary } from "./helpers";

const all = [summary("v"), summary("p"), summary("n")];
const visited = new Set(["v"]);
const pending = new Set(["p"]);

describe("filterCandidates", () => {
  it("newOnly drops visited and keeps pending marked", () => {
    const out = filterCandidates(all, visited, pending, true);
    expect(out.map((c) => [c.googlePlaceId, c.status])).toEqual([
      ["p", "pending"],
      ["n", null],
    ]);
  });
  it("keeps everything with its status when not newOnly", () => {
    const out = filterCandidates(all, visited, pending, false);
    expect(out.map((c) => [c.googlePlaceId, c.status])).toEqual([
      ["v", "visited"],
      ["p", "pending"],
      ["n", null],
    ]);
  });
});
