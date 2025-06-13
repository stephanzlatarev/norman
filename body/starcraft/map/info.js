import fs from "fs";
import Board from "./board.js";

// Use this function to store the map info for AI Arena Kibitz
// Change zone.js:MIN_SQUARE_DISTANCE_START_ZONES to equal MIN_SQUARE_DISTANCE_DEPOT_ZONES

export default function(gameInfo) {
  const name = gameInfo.localMapPath.split(".")[0];
  const center = pos((Board.left + Board.right) / 2, (Board.top + Board.bottom) / 2);

  const text = [
    `export default {`,
    `  left: ${Board.left},`,
    `  top: ${Board.top},`,
    `  width: ${Board.width},`,
    `  height: ${Board.height},`,
    `  zones: [`,
  ];

  for (let y = 0; y < Board.bottom; y++) {
    const line = [];

    for (let x = 0; x < Board.right; x++) {
      const cell = Board.cells[y][x];
      line.push(cell.zone ? pos(cell.zone.x, cell.zone.y) : center);
    }

    text.push("    [" + line.join(",") + "],");
  }

  text.push("  ]");
  text.push("}");

  fs.writeFileSync(name + ".js", text.join("\r\n"));
}

function pos(x, y) {
  return Math.floor(x - Board.left) * 1000 + Math.floor(Board.bottom - y);
}
