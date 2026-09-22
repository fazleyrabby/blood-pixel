/**
 * SpatialHash.ts
 * Uniform grid spatial hash for O(1) broad-phase entity queries.
 * Used for zombie→zombie separation and projectile→zombie collision.
 *
 * Phase 2 / 3 — Core Systems
 */

export interface SpatialItem {
  id: number;
  x: number;
  y: number;
  radius?: number;
}

export class SpatialHash<T extends SpatialItem> {
  private cells = new Map<number, T[]>();
  private readonly cellSize: number;

  constructor(cellSize = 80) {
    this.cellSize = cellSize;
  }

  private _key(cx: number, cy: number): number {
    // Cantor pairing — works for reasonable grid coords
    return ((cx + 10000) * 20001) + (cy + 10000);
  }

  private _cellCoord(v: number): number {
    return Math.floor(v / this.cellSize);
  }

  clear(): void {
    this.cells.clear();
  }

  insert(item: T): void {
    const cx = this._cellCoord(item.x);
    const cy = this._cellCoord(item.y);
    const key = this._key(cx, cy);
    let cell = this.cells.get(key);
    if (!cell) { cell = []; this.cells.set(key, cell); }
    cell.push(item);
  }

  /** Query all items in cells overlapping a circle of given radius */
  query(x: number, y: number, radius: number): T[] {
    const result: T[] = [];
    const minCX = this._cellCoord(x - radius);
    const maxCX = this._cellCoord(x + radius);
    const minCY = this._cellCoord(y - radius);
    const maxCY = this._cellCoord(y + radius);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(this._key(cx, cy));
        if (cell) {
          for (const item of cell) result.push(item);
        }
      }
    }
    return result;
  }
}
