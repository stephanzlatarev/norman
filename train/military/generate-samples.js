import fs from "fs";

function display(placements) {
  for (let y = 0; y < 10; y++) {
    const line = [];

    for (let x = 0; x < 10; x++) {
      line.push(cell(placements[x + y * 10]));
    }

    console.log(line.join(" "));
  }
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

function zero(size) {
  const array = [];

  for (let i = 0; i < size; i++) {
    array.push(0);
  }

  return array;
}

function round(value) {
  return Math.floor(value * 100) / 100;
}

function random(count) {
  const placements = zero(100);

  for (let i = 1; i <= count; i++) {
    const spot = Math.floor(Math.random() * 100);
    placements[spot] = round(Math.random() * 100);
  }

  return placements;
}

function base1(count) {
  const placements = zero(100);

  for (let i = 1; i <= count; i++) {
    const spot = Math.floor(Math.random() * 4) + Math.floor(Math.random() * 4) * 10;
    placements[spot] = round(Math.random() * 100);
  }

  return placements;
}

function base2(count) {
  const placements = zero(100);

  for (let i = 1; i <= count; i++) {
    const spot = (9 - Math.floor(Math.random() * 4)) + (9 - Math.floor(Math.random() * 4)) * 10;
    placements[spot] = round(Math.random() * 100);
  }

  return placements;
}

function attack(enemy, army) {
  const attack = zero(army.length);

  const coordinates = [];
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      const spot = x + y * 10;
      const troops = enemy[spot];
      if (troops) {
        coordinates.push({ spot: spot, distance: Math.sqrt((10 - x) * (10 - x) + (10 - y) * (10 - y)), troops: troops });
      }
    }
  }
  coordinates.sort((a, b) => a.distance - b.distance);

  let armyTroops = 0; for (const troops of army) armyTroops += troops;
  let enemyTroops = 0; for (const troops of enemy) enemyTroops += troops;
  const factor = Math.max(1.2, round(armyTroops / enemyTroops));
  for (const one of coordinates) {
    if (armyTroops <= 0) break;
    const troops = round(Math.min(armyTroops, one.troops * factor));
    attack[one.spot] = troops;
    armyTroops -= troops;
  }

  return attack;
}

const samples = { input: [], output: [] };

for (let i = 0; i < 10000; i++) {
  const enemyMilitary = random(10);
  const ownMilitary = random(10);
  const input = [...enemyMilitary, ...base1(5), ...ownMilitary, ...base2(5)];
  const output = attack(enemyMilitary, ownMilitary);
  samples.input.push(input);
  samples.output.push(output);
}
fs.writeFileSync("./train/military/samples.json", JSON.stringify(samples));

//console.log("=======");
//for (const one of input) {
//  display(one);
//  console.log("=======");
//}
//display(output);
//console.log("=======");


