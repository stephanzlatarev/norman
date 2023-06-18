import { WARRIORS } from "../units.js";

export default async function(model, client) {
  const grid = makeGrid(model.get("Map"));
  const deployment = model.add("Troops deployment").values(100);

  const deploymentPos = pos(grid, findDeployment(deployment));
  const unitTags = units(model);

  if (unitTags && unitTags.length) {
    command(client, unitTags, 16, deploymentPos);
  }
}

function makeGrid(map) {
  return {
    left: map.get("left"),
    top: map.get("top"),
    width: map.get("width"),
    height: map.get("height"),
    cellWidth: map.get("cellWidth"),
    cellHeight: map.get("cellHeight"),
  };
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

// TODO: Return only the units which are not near their target deployment position and are not ordered to go to it
function units(model) {
  return model.observation.ownUnits.filter(unit => WARRIORS[unit.unitType]).map(unit => unit.tag);
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
