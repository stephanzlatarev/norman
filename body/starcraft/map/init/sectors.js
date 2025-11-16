import Board from "../board.js";
import Sector from "../sector.js";

const SECTOR_NAME_COLS = "ABCDEFGHIJ";
const SECTOR_NAME_ROWS = "0123456789";

export function initSectors() {
  const colsize = (Board.right - Board.left) / 10;
  const rowsize = (Board.bottom - Board.top) / 10;
  const sectors = new Map();
  const cols = [];
  const rows = [];

  // Precompute column and row indices for each x and y
  for (let i = 0; i < 10; i++) {
    const colstart = Math.floor(Board.left + i * colsize);
    const colend = Math.min(colstart + colsize + 1, Board.right);
    const rowstart = Math.floor(Board.top + i * rowsize);
    const rowend = Math.min(rowstart + rowsize + 1, Board.bottom);

    for (let x = colstart; x <= colend; x++) cols[x] = i;
    for (let y = rowstart; y <= rowend; y++) rows[y] = i;
  }

  // Create the sectors
  for (let col = 0; col < 10; col++) {
    for (let row = 0; row < 10; row++) {
      const key = row * 10 + col;
      const cell = Board.cell(Board.left + col * colsize + colsize / 2, Board.top + row * rowsize + rowsize / 2);
      const sector = new Sector(cell);

      sector.name = SECTOR_NAME_COLS[col] + SECTOR_NAME_ROWS[row];

      sectors.set(key, sector);
    }
  }

  // Assign cells to sectors
  for (let x = Board.left; x <= Board.right; x++) {
    for (let y = Board.top; y <= Board.bottom; y++) {
      const cell = Board.cell(x, y);
      const key = rows[y] * 10 + cols[x];
      const sector = sectors.get(key);

      cell.sector = sector;
      sector.cells.add(cell);
    }
  }
}

export function separateSectors(cluster) {
  const groups = new Map();

  for (const cell of cluster.cells) {
    const sector = cell.sector;

    let group = groups.get(sector);

    if (!group) {
      group = new Set();
      groups.set(sector, group);
    }

    group.add(cell);
  }

  return Array.from(groups.values()).map(cells => cluster.derive(cells));
}
