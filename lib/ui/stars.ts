/** Value (0.5 steps) of the star at `index` given a pointer x offset inside that star. */
export function starFromPointer(x: number, width: number, index: number): number {
  return x < width / 2 ? index + 0.5 : index + 1;
}

/** Tapping the current value clears it; otherwise the tapped value is selected. */
export function nextStarValue(current: number | null, tapped: number): number | null {
  return current === tapped ? null : tapped;
}
