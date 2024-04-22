
export default class Board {

  constructor(box, placementGrid, pathingGrid) {
    this.box = box;
    this.cells = [];
    this.areas = new Set();
    this.joins = new Set();

    const size = placementGrid.size;

    for (let y = 0; y < size.y; y++) {
      const row = [];

      for (let x = 0; x < size.x; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;

        const isOn = (x >= box.left) && (x <= box.right) && (y >= box.top) && (y <= box.bottom);
        const isPlot = (placementGrid.data[Math.floor(index / 8)] & mask) != 0;
        const isPath = (pathingGrid.data[Math.floor(index / 8)] & mask) != 0;

        row.push(new Cell(x, y, isOn, isPath, isPlot));
      }

      this.cells.push(row);
    }
  }

  sync(grid) {
    const size = grid.size;

    for (let y = this.box.top; y <= this.box.bottom; y++) {
      for (let x = this.box.left; x < this.box.right; x++) {
        const index = x + y * size.x;
        const pos = 7 - index % 8;
        const mask = 1 << pos;

        const isPath = (grid.data[Math.floor(index / 8)] & mask) != 0;

        if (isPath !== this.cells[y][x].isPath) {
          this.cells[y][x].isPath = isPath;
        }
      }
    }
  }

  path() {
    findAreas(this, listLayers(this));
  }

  mark(left, top, width, height, mark) {
    for (let row = top; row < top + height; row++) {
      for (let col = left; col < left + width; col++) {
        mark(this.cells[row][col]);
      }
    }
  }

  clear(left, top, width, height) {
    for (let row = top; row < top + height; row++) {
      for (let col = left; col < left + width; col++) {
        this.cells[row][col].clear();
      }
    }
  }

}

class Cell {

  constructor(x, y, isOn, isPath, isPlot) {
    this.id = y * 1000 + x + 1;
    this.x = x;
    this.y = y;
    this.isOn = isOn;
    this.isPath = isPath;
    this.isPlot = isPlot;
    this.isObstacle = false;
    this.isMarked = false;

    this.margin = 0;
    this.area = null;
    this.join = null;
  }

  clear() {
    this.isPath = true;
    this.isPlot = true;
  }

}

class Area {

  constructor(board, cell) {
    this.id = cell.id;
    this.board = board;
    this.boundary = { left: cell.x, top: cell.y, right: cell.x, bottom: cell.y };
    this.center = cell;
    this.level = cell.margin;

    this.cells = new Set();
    this.joins = new Set();
    this.ramps = new Set();

    this.addCell(cell);

    board.areas.add(this);
  }

  addCell(cell) {
    if (cell.join && ((cell.join.areas.size >= 2) && !cell.join.areas.has(this))) return;

    if (cell.area && (cell.area !== this)) console.log("OOOPS! A cell that belongs to an area is added to another area!");

    cell.area = this;

    if (cell.isPlot) {
      this.cells.add(cell);

      if (cell.join) {
        this.joins.add(cell.join);
        cell.join.areas.add(this);
      }

      const boundary = this.boundary;
  
      boundary.left = Math.min(boundary.left, cell.x);
      boundary.top = Math.min(boundary.top, cell.y);
      boundary.right = Math.max(boundary.right, cell.x);
      boundary.bottom = Math.max(boundary.bottom, cell.y);
    } else {
      this.ramps.add(cell);

      if (cell.join && ((cell.join.areas.size < 2) || cell.join.areas.has(this))) {
        this.joins.add(cell.join);
        cell.join.areas.add(this);
      }
    }
  }

  addArea(area) {
    if (area.level > this.level) console.log("OOOPS! A higher-level area is added to a lower-level area!");

    for (const cell of area.cells) {
      cell.area = null;
      this.addCell(cell);
    }

    for (const cell of area.ramps) {
      cell.area = null;
      this.addCell(cell);
    }

    for (const join of area.joins) {
      this.joins.add(join);

      join.areas.delete(area);
      join.areas.add(this);
    }

    this.board.areas.delete(area);
  }

  canMerge(area) {
    // Check if cells from the two areas at the highest same level of each area are adjacent.
    const higher = (this.level >= area.level) ? this : area;
    const lower = (this === higher) ? area : this;
    const higherTerrace = [];
    const higherTop = [];
    const lowerTop = [];

    for (const a of lower.cells) {
      if (a.margin !== lower.level) continue;

      if (higherTerrace.length) {
        for (const b of higherTerrace) {
          if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 2) {
            return true;
          }
        }
      } else {
        for (const b of higher.cells) {
          if (b.margin === higher.level) higherTop.push(b);
          if (b.margin !== lower.level) continue;
  
          if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 2) {
            return true;
          }

          higherTerrace.push(b);
        }
      }

      lowerTop.push(a);
    }

    for (const a of lowerTop) {
      for (const b of higherTop) {
        if (Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > higher.level + 10) {
          return false;
        }
      }
    }

    return true;
  }

  merge(area) {
    if (this.level < area.level) {
      area.addArea(this);
    } else {
      this.addArea(area);
    }
  }

  findCenter() {
    this.center = findCenter(this.cells);
  }

}

class Join {

  constructor(board, leftCell, rightCell) {
    this.id = leftCell.id;
    this.board = board;
    this.center = leftCell;

    this.cells = new Set();
    this.areas = new Set();

    this.addCell(leftCell);

    if (rightCell) {
      this.addCell(rightCell);
    }

    board.joins.add(this);
  }

  addCell(cell) {
    if (cell.join === this) return;
    if (cell.area && (this.areas.size === 2) && !this.areas.has(cell.area)) return;

    this.cells.add(cell);

    if (cell.area) {
      this.areas.add(cell.area);
      cell.area.joins.add(this);

      if (cell.join && (cell.join !== this)) {
        this.merge(cell.join);
      } else {
        cell.join = this;
      }
    } else {
      cell.join = this;
    }
  }

  merge(join) {
    if (this === join) return;

    // Check that the merge will not result in more than two connected areas
    if (this.areas.size + [...join.areas].filter(area => !this.areas.has(area)).length > 2) return;

    for (const cell of join.cells) {
      this.cells.add(cell);

      if (cell.area && !this.areas.has(cell.area)) {
        this.areas.add(cell.area);
        cell.area.joins.add(this);
      }

      cell.join = this;
    }

    for (const area of join.areas) {
      this.areas.add(area);

      area.joins.delete(join);
      area.joins.add(this);
    }

    this.board.joins.delete(join);
  }

  remove() {
    for (const cell of this.cells) {
      cell.join = null;
    }

    for (const area of this.areas) {
      area.joins.delete(this);
    }

    this.board.joins.delete(this);
  }

  findCenter() {
    this.center = findCenter(this.cells);
  }
}

function listLayers(board) {
  const margins = [];
  const SIDES = [{ dx: -1, dy: 0 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }];
  const SIDE_MARGIN = 1;
  const CORNERS = [{ dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 }];
  const CORNER_MARGIN = 1;

  let batch = new Set();
  let margin = 2;

  for (let row = board.box.top + 1; row < board.box.bottom; row++) {
    for (let col = board.box.left + 1; col < board.box.right; col++) {
      const cell = board.cells[row][col];

      if (cell.isPath) {
        for (const side of SIDES) {
          const neighbor = board.cells[row + side.dy][col + side.dx];

          if (!neighbor.isPath) {
            cell.margin = SIDE_MARGIN;
            batch.add(cell);
            break;
          }
        }

        if (cell.margin) continue;

        for (const corner of CORNERS) {
          const neighbor = board.cells[row + corner.dy][col + corner.dx];

          if (!neighbor.isPath) {
            cell.margin = CORNER_MARGIN;
            batch.add(cell);
            break;
          }
        }
      }
    }
  }

  while (batch.size) {
    margins.push(batch);

    const next = new Set();

    for (const cell of batch) {
      if (cell.margin <= margin) {
        for (const side of SIDES) {
          const neighbor = board.cells[cell.y + side.dy][cell.x + side.dx];

          if (neighbor.isPath) {
            if (neighbor.margin) {
              neighbor.margin = Math.min(cell.margin + SIDE_MARGIN, neighbor.margin);
            } else {
              neighbor.margin = cell.margin + SIDE_MARGIN;
              next.add(neighbor);
            }
          }
        }

        for (const corner of CORNERS) {
          const neighbor = board.cells[cell.y + corner.dy][cell.x + corner.dx];

          if (neighbor.isPath) {
            if (neighbor.margin) {
              neighbor.margin = Math.min(cell.margin + CORNER_MARGIN, neighbor.margin);
            } else {
              neighbor.margin = cell.margin + CORNER_MARGIN;
              next.add(neighbor);
            }
          }
        }
      } else {
        next.add(cell);
      }
    }

    batch = next;
    margin++;
  }

  return margins.reverse();
}

function findAreas(board, margins) {
  board.areas.clear();
  board.joins.clear();

  // Create joins for all non-plot cells.
  for (const layer of margins) {
    for (const cell of layer) {
      if (!cell.isPlot) {
        new Join(board, cell);
      }
    }
  }

  for (const layer of margins) {
    for (const cell of [...layer].reverse()) {
      markSideNeighbors(board.cells, cell, function(neighbor) {
        if (!neighbor.isPath) return;
 
        if (cell.isPlot && !cell.area && !cell.join && !neighbor.join && (cell.margin > neighbor.margin)) {
          // Create an area around this cell to ensure areas merge instead of this cell being added to the neighbor area regardless of margin.
          new Area(board, cell);
        }

        if (cell.join && neighbor.join) {
          cell.join.merge(neighbor.join);
        } else if (cell.area) {
          if (neighbor.area === cell.area) {
            // Both cells belong to the same area. Do nothing.
          } else if (neighbor.area) {
            // The two cells belong to different areas. The areas should either merge or form a join.
            if (cell.area.canMerge(neighbor.area)) {
              cell.area.merge(neighbor.area);
            } else {
              new Join(board, cell, neighbor);
            }
          } else {
            // The neighbor cell doesn't belong to an area. Add it to this area.
            cell.area.addCell(neighbor);
          }
        } else if (neighbor.area) {
          neighbor.area.addCell(cell);
        } else  if (neighbor.isPlot && (neighbor.margin > cell.margin)) {
          new Area(board, neighbor).addCell(cell);
        } else if (cell.isPlot) {
          new Area(board, cell).addCell(neighbor);
        }
      });
    }
  }

  for (const area of board.areas) {
    area.findCenter();
  }

  for (const join of board.joins) {
    if (join.areas.size < 2) {
      join.remove();
    }

    join.findCenter();
  }
}

function markSideNeighbors(cells, cell, mark) {
  return mark(cells[cell.y + 1][cell.x + 1], cell)
      || mark(cells[cell.y + 1][cell.x    ], cell)
      || mark(cells[cell.y + 1][cell.x - 1], cell)
      || mark(cells[cell.y    ][cell.x + 1], cell)
      || mark(cells[cell.y    ][cell.x - 1], cell)
      || mark(cells[cell.y - 1][cell.x + 1], cell)
      || mark(cells[cell.y - 1][cell.x    ], cell)
      || mark(cells[cell.y - 1][cell.x - 1], cell);
}

function findCenter(cells) {
  const list = [];
  let maxlevel = 0;
  let sumx = 0;
  let sumy = 0;

  for (const cell of cells) {
    if (cell.margin > maxlevel) {
      list.length = 0;
      maxlevel = cell.margin;
      sumx = 0;
      sumy = 0;
    }

    if (cell.margin === maxlevel) {
      list.push(cell);

      sumx += cell.x;
      sumy += cell.y;
    }
  }

  const avgx = sumx / list.length;
  const avgy = sumy / list.length;

  let center;
  let bestDistance = Infinity;

  for (const cell of list) {
    const distance = Math.max(Math.abs(cell.x - avgx), Math.abs(cell.y - avgy));

    if (distance < bestDistance) {
      center = cell;
      bestDistance = distance;
    }
  }

  return center;
}
