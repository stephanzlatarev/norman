
const EMPTY = " ";

export default class Board {

  constructor(lines) {
    this.lines = lines;
  }

  copy() {
    return new Board(Array.from(this.lines));
  }

  get(x, y) {
    return this.lines[y][x];
  }

  one(symbol, x, y, w, h) {
    const ww = Math.min(w, this.lines[0].length - x);
    const hh = Math.min(h, this.lines.length - y);

    for (let row = y; row < y + hh; row++) {
      const line = this.lines[row];

      this.lines[row] = line.substring(0, x) + string(symbol, ww) + line.substring(x + ww);
    }
  }

  many(symbol, w, h) {
    const blocks = [];
    const cells = prefix(this.lines);
    const rows = cells.length;
    const cols = cells[0].length;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = cells[row][col];

        if ((cell.w >= w) && (cell.h >= h)) {
          const block = { x: col, y: row, w: w, h: h, left: col, top: row, right: col + w - 1, bottom: row + h - 1 };
          const collision = blocks.find(other => intersect(block, other));

          if (collision) {
            col = collision.right;
          } else {
            this.one(symbol, col, row, w, h);

            blocks.push(block);
          }
        }
      }
    }

    return blocks;
  }

  base(anchorX, anchorY, size, range) {
    const cells = prefix(this.lines);

    const minX = Math.max(anchorX - range, 0);
    const minY = Math.max(anchorY - range, 0);
    const maxX = Math.min(anchorX + range, cells[0].length);
    const maxY = Math.min(anchorY + range, cells.length);

    let best = Infinity;
    let bestX;
    let bestY;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const cell = cells[y][x];

        if ((cell.w >= size) && (cell.h >= size)) {
          const distance = squareDistance(anchorX, anchorY, x + size / 2, y + size / 2);

          if (distance < best) {
            best = distance;
            bestX = x;
            bestY = y;
          }
        }
      }
    }

    if (bestX && bestY) {
      return { x: bestX, y: bestY, w: size, h: size };
    }
  }

}

function prefix(lines) {
  const prefix = lines.map(line => Array.from(line).map(_ => ({ w: 0, h: 0 })));

  for (let row = lines.length - 2; row >= 0; row--) {
    const line = lines[row];

    for (let col = line.length - 2; col >= 0; col--) {
      if (line[col] === EMPTY) {
        const cell = prefix[row][col];
        const right = prefix[row][col + 1];
        const bottom = prefix[row + 1][col];
        const diagonal = prefix[row + 1][col + 1];

        cell.w = Math.min(right.w + 1, diagonal.w + 1);
        cell.h = Math.min(bottom.h + 1, diagonal.h + 1);
      }
    }
  }

  return prefix;
}

function revisit(lines, prefix, x, y, w, h) {
  let lastEmptyCol = 0;

  for (let row = y + h - 1; row >= 0; row--) {
    const line = lines[row];

    for (let col = x + w - 1; col >= 0; col--) {
      const cell = prefix[row][col];

      if (line[col] === EMPTY) {
        const right = prefix[row][col + 1];
        const bottom = prefix[row + 1][col];
        const diagonal = prefix[row + 1][col + 1];

        cell.w = Math.min(right.w + 1, diagonal.w + 1);
        cell.h = Math.min(bottom.h + 1, diagonal.h + 1);
      } else {
        cell.w = 0;
        cell.h = 0;

        if ((row < y) && (col > lastEmptyCol)) lastEmptyCol = col;
        if (col < x) break;
      }
    }

    if (lastEmptyCol >= x + w - 1) break;
  }
}

function string(symbol, length) {
  let string = "";

  for (let i = 0; i < length; i++) {
    string += symbol;
  }

  return string;
}

function intersect(a, b) {
  return (a.left <= b.right) && (a.right >= b.left) && (a.top <= b.bottom) && (a.bottom >= b.top);
}

function squareDistance(x1, y1, x2, y2) {
  return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
