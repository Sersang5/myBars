/** Value (0.5 steps) of the star at `index` given a pointer x offset inside that star. */
export function starFromPointer(x: number, width: number, index: number): number {
  return x < width / 2 ? index + 0.5 : index + 1;
}
