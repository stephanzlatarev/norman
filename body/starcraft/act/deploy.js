import { WARRIORS } from "../units.js";

export default async function(model, client) {
  const grid = model.get("Map").data;
  const deployment = model.add("Troops deployment").values(100);

  const deploymentPos = pos(grid, findDeployment(deployment));
  const unitTags = units(model, grid, deploymentPos);

  if (unitTags && unitTags.length) {
    command(client, unitTags, 16, deploymentPos);
  }
}

function findDeployment(deployment) {
  let maxValue = 0;
  let maxCoordinates = 0;

  for (let coordinates in deployment) {
    if (deployment[coordinates] > maxValue) {
      maxCoordinates = coordinates;
      maxValue = deployment[coordinates];
    }
  }

  return maxCoordinates;
}

function pos(grid, coordinates) {
  const row = coordinates % 10;
  const col = Math.floor(coordinates / 10);
  const x = grid.left + row * grid.cellWidth + grid.cellWidth / 2;
  const y = grid.top + col * grid.cellHeight + grid.cellHeight / 2;

  return { x: x, y: y};
}

function units(model, grid, pos) {
  return model.observation.ownUnits.filter(unit => WARRIORS[unit.unitType]).filter(unit => (!near(unit, grid, pos) && !engaged(unit, grid, pos))).map(unit => unit.tag);
}

function near(unit, grid, pos) {
  return (Math.abs(unit.pos.x - pos.x) <= grid.cellWidthHalf) && (Math.abs(unit.pos.y - pos.y) <= grid.cellHeightHalf);
}

function engaged(unit, grid, pos) {
  if (!unit.orders.length) {
    return false;
  }

  if (unit.orders[0].abilityId === 16) {
    const target = unit.orders[0].targetWorldSpacePos;
    return (Math.abs(target.x - pos.x) <= grid.cellWidthHalf) && (Math.abs(target.y - pos.y) <= grid.cellHeightHalf);
  }

  return true;
}

async function command(client, unitTags, abilityId, targetWorldSpacePos) {
  const command = { unitTags: unitTags, abilityId: abilityId, targetWorldSpacePos: targetWorldSpacePos, queueCommand: false };
  const response = await client.action({ actions: [{ actionRaw: { unitCommand: command } }] });
  if (response.result[0] !== 1) console.log(JSON.stringify(command), ">>", JSON.stringify(response));
}

function show(title, heatmap) {
  console.log("= __________________________________________ =", title);
  console.log(" |                                          | ");
  for (let offset = 90; offset >= 0; offset -= 10) {
    const line = [];
    for (let x = 0; x < 10; x++) {
      const v = heatmap[offset + x];
      if (v >= 0.1) {
        let c = "" + Math.floor(v * 10);
        while (c.length < 4) c = " " + c;
        line.push(c);
      } else {
        line.push("    ");
      }
    }
    console.log(" |", line.join(""), "|");
  }
  console.log(" |__________________________________________| ");
  console.log("=                                            =");
  console.log();
}
