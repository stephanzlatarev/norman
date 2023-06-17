import ttys from "ttys";

const GRID_WIDTH = 46;
const GRID_HEIGHT = 13;

const frames = {};

export function show(message) {
  ttys.stdout.write("\x1b[1000D");
  ttys.stdout.write("\x1b[A");
  console.log(message, "                         ");
}

export default function display(heatmap, col, row) {
  const offsetx = col * GRID_WIDTH;
  const offsety = row * GRID_HEIGHT;

  if (!frames[col + ":" + row]) {
    frame(offsetx, offsety);
    frames[col + ":" + row] = true;
  }

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const value = heatmap[x + y * 10];
      ttys.stdout.write("\x1b[" + (offsety + y + 3) + ";" + (offsetx + x * 4 + 3) + "H");
      ttys.stdout.write(cell(value));
    }
  }

  // Move cursor to after display
  ttys.stdout.write("\x1b[" + ((row + 1) * GRID_HEIGHT + 1) + ";0H");
}

function cell(value) {
  if (value > 0) {
    if (value >= 100) return " ###";

    let cell = "" + Math.floor(value * 10);
    while (cell.length < 4) cell = " " + cell;
    return cell;
  }

  return "    ";
}

function frame(offsetx, offsety) {
  ttys.stdout.write("\x1b[" + (offsety + 1) + ";" + offsetx + "H");
  console.log("  __________________________________________  ");
  ttys.stdout.write("\x1b[" + (offsety + 2) + ";" + offsetx + "H");
  console.log(" |                                          | ");
  for (let y = 0; y < 10; y++) {
    const line = [];
    for (let x = 0; x < 10; x++) {
      line.push("    ");
    }
    ttys.stdout.write("\x1b[" + (offsety + y + 3) + ";" + offsetx + "H");
    console.log(" |", line.join(""), "| ");
  }
  ttys.stdout.write("\x1b[" + (offsety + 13) + ";" + offsetx + "H");
  console.log(" |__________________________________________| ");
  ttys.stdout.write("\x1b[" + (offsety + 14) + ";" + offsetx + "H");
}

// Hide cursor
ttys.stdout.write("\x1b[?25l");
