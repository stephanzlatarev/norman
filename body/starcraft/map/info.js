import fs from "fs";
import Board from "./board.js";

// Use this function to store the map info for AI Arena Kibitz
// Change zone.js:MIN_SQUARE_DISTANCE_START_ZONES to equal MIN_SQUARE_DISTANCE_DEPOT_ZONES

export default function() {
  let text = `
export default {
  left: ${Board.left},
  top: ${Board.top},
  width: ${Board.width},
  height: ${Board.height},
  zones: [`;

  for (let y = Board.top + Board.height - 1; y >= 0; y--) {
    const line = [];
    for (const cell of Board.cells[y]) {
      line.push(cell.zone ? cell.zone.cell.x * 1000 + cell.zone.cell.y : 0);
    }
    text += `
    [${line.join(",")}]`;
    if (y) text += ",";
  }

  text += `
  ]
}`;

  fs.writeFileSync("map-info.js", text.trim());
}
