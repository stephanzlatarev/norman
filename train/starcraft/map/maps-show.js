import ttys from "ttys";
import { MAPS, map } from "./maps.js";

for (const mapName of MAPS) {
  const time = new Date().getTime();
  const it = map(mapName);
  const millis = (new Date().getTime() - time);

  const lines = it.map();
  for (let y = it.grid.top; y < it.grid.top + it.grid.height; y++) {
    showLine(it.grid, y, lines[y]);
  }

  console.log();
  console.log("Map", mapName, "with", it.clusters.length, "clusters", it.nexuses.length, "nexuses", it.bases.length, "bases", millis, "millis");
  console.log();
}

function showLine(grid, y, line) {
  let color = null;

  for (let x = grid.left; x < grid.left + grid.width; x++) {
    const thisColor = chooseColor(grid, x, y, line[x]);

    if (thisColor !== color) {
      ttys.stdout.write("\x1b[48;2;" + thisColor + "m");
      color = thisColor;
    }

    ttys.stdout.write(line[x]);
  }

  ttys.stdout.write("\x1b[0m");
  ttys.stdout.write("\r\n");
}

function chooseColor(grid, x, y, symbol) {
  if (symbol === "M") return "0;191;255";
  if (symbol === "V") return "143;188;143";
  if (symbol === "N") return "255;215;0";
  if (symbol === "|") return "147;112;219";
  if (symbol === "?") return "139;0;0";

  const cx = Math.floor((x - grid.left) / grid.cellWidth);
  const cy = Math.floor((y - grid.top) / grid.cellHeight);

  return ((cx % 2) + (cy % 2) === 1) ? "50;50;50" : "100;100;100";
}
