import fs from "fs";
import display from "./display.js";
import mirrors from "./mirrors.js";

// Generates training samples for attack with first wave of warriors (at least one and up to three own units) against enemy base (at least one and up to three structures)
// - vs no enemy units -> direct attack against enemy base
// - vs weaker enemy unit -> direct attack against enemy
// - vs stronger enemy unit -> spread troops on a front line

function array(size, value) {
  const array = [];

  for (let i = 0; i < size; i++) {
    array.push(value);
  }

  return array;
}

function set(array, x, y, value) {
  array[x + y * 10] = value;
}

const samples = { input: [], output: [] };

let ZEROES = array(100, 0);

let known = {};
let ownMilitary = [...ZEROES];
let ownEconomy = [...ZEROES];
let enemyMilitary = [...ZEROES];
let enemyEconomy = [...ZEROES];
let deployment = [...ZEROES];

const ALL_POSITIONS = [];
for (let x = 0; x < 10; x++) {
  for (let y = 0; y < 10; y++) {
    ALL_POSITIONS.push({ x: x, y: y });
  }
}

const ENEMY_POSITIONS = [];
for (let x = 0; x < 4; x++) {
  for (let y = 0; y < 4; y++) {
    ENEMY_POSITIONS.push({ x: x, y: y });
  }
}

const OWN_POSITIONS = [];
for (let x = 6; x < 10; x++) {
  for (let y = 6; y < 10; y++) {
    OWN_POSITIONS.push({ x: x, y: y });
  }
}

// Versus no enemy units
for (const enemyBase of ENEMY_POSITIONS) {
  set(enemyEconomy, enemyBase.x, enemyBase.y, 1);
  set(deployment, enemyBase.x, enemyBase.y, 1);

  for (const ownMilitaryUnit1 of ALL_POSITIONS) {
    set(ownMilitary, ownMilitaryUnit1.x, ownMilitaryUnit1.y, 1);

    for (const ownBase of OWN_POSITIONS) {
      set(ownEconomy, ownBase.x, ownBase.y, 1);
  
      for (const mirror of mirrors) {
        const input = [...mirror(ownMilitary), ...mirror(ownEconomy), ...mirror(enemyMilitary), ...mirror(enemyEconomy)];
        const hash = JSON.stringify(input);
  
        if (!known[hash]) {
          samples.input.push(input);
          samples.output.push([...mirror(deployment)]);
          known[hash] = true;
        }
      }
  
      ownEconomy = [...ZEROES];
    }

    ownMilitary = [...ZEROES];
  }

  enemyEconomy = [...ZEROES];
  deployment = [...ZEROES];
}

//Versus strong enemy units
for (const enemyBase of ENEMY_POSITIONS) {
  set(enemyEconomy, enemyBase.x, enemyBase.y, 1);
  set(deployment, 5, 5, 1);
  
  for (const enemyMilitaryUnit1 of ENEMY_POSITIONS) {
    set(enemyMilitary, enemyMilitaryUnit1.x, enemyMilitaryUnit1.y, 1);

    for (const ownBase of OWN_POSITIONS) {
      set(ownEconomy, ownBase.x, ownBase.y, 1);
 
      for (const mirror of mirrors) {
        const input = [...mirror(ownMilitary), ...mirror(ownEconomy), ...mirror(enemyMilitary), ...mirror(enemyEconomy)];
        const hash = JSON.stringify(input);
    
        if (!known[hash]) {
          samples.input.push(input);
          samples.output.push([...mirror(deployment)]);
          known[hash] = true;
        }
      }

      ownEconomy = [...ZEROES];
    }

    enemyMilitary = [...ZEROES];
  }
  
  enemyEconomy = [...ZEROES];
  deployment = [...ZEROES];
}

const r = Math.floor(Math.random() * samples.input.length);
console.log("Sample #" + r);
display([...samples.input[r], ...samples.output[r]], 10, 10);
console.log();

console.log("Saving", samples.input.length, "samples");
fs.writeFileSync("./train/sampling/samples.json", JSON.stringify(samples));
