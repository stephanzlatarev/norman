import Board from "../board.js";
import Sector from "../sector.js";

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
  for (let col = 0, x = Board.left + colsize / 2; col < 10; col++, x += colsize) {
    for (let row = 0, y = Board.top + rowsize / 2; row < 10; row++, y += rowsize) {
      const sector = new Sector(row, col);
      sector.x = Math.floor(x);
      sector.y = Math.floor(y);
      sectors.set(row * 10 + col, sector);
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

  // Assign neighboring sectors
  for (const sector of sectors.values()) {
    const row = sector.row;
    const col = sector.col;

    const east = (col < 9) ? sectors.get(row * 10 + (col + 1)) : null;
    if (east) {
      sector.neighbors.add(east);
      east.neighbors.add(sector);
    }

    const southwest = (row < 9) && (col > 0) ? sectors.get((row + 1) * 10 + (col - 1)) : null;
    if (southwest) {
      sector.neighbors.add(southwest);
      southwest.neighbors.add(sector);
    }

    const south = (row < 9) ? sectors.get((row + 1) * 10 + col) : null;
    if (south) {
      sector.neighbors.add(south);
      south.neighbors.add(sector);
    }

    const southeast = (row < 9) && (col < 9) ? sectors.get((row + 1) * 10 + (col + 1)) : null;
    if (southeast) {
      sector.neighbors.add(southeast);
      southeast.neighbors.add(sector);
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
