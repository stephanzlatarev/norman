import debug from "./debug.js";

const MOVES = [];
const DIRECTIONS = 12;
for (let i = 0; i < DIRECTIONS; i++) {
  const angle = Math.PI * i * 2 / DIRECTIONS;
  MOVES.push({ x: Math.sin(angle), y: Math.cos(angle) });
}

export default async function(combat) {
  for (const warrior of combat.warriors) {
    if (warrior.isBusy) continue;

    const speed = warrior.speed;
    let bestPos = warrior.pos;
    let bestScore = scoreMove(warrior, warrior.pos, combat.warriors, combat.enemies, combat.obstacles);

    for (const move of MOVES) {
      const pos = { x: warrior.pos.x + move.x * speed, y: warrior.pos.y + move.y * speed };
      const score = scoreMove(warrior, pos, combat.warriors, combat.enemies, combat.obstacles);

      if (score < bestScore) {
        const COMMAND_MOVE_SIZE = 2.0;
        bestPos = { x: warrior.pos.x + move.x * COMMAND_MOVE_SIZE, y: warrior.pos.y + move.y * COMMAND_MOVE_SIZE };
        bestScore = score;
      }
    }

    if (bestPos !== warrior.pos) {
      await performMove(combat, warrior, bestPos);
    }

    debug.arrow(debug.green, warrior.pos, bestPos);
  }
}

function scoreMove(warrior, pos, warriors, enemies, obstacles) {
  let score = 0;

  for (const list of [warriors, enemies, obstacles]) {
    for (const unit of list) {
      for (const pulse of unit.pulses) {
         score += pulse.measure(warrior, pos);
      }
    }
  }

  return score;
}

async function performMove(combat, warrior, pos) {
  await combat.command({ unitTags: [warrior.tag], abilityId: 16, targetWorldSpacePos: pos, queueCommand: false });
}
