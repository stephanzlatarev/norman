
const SWAP_DISTANCE = 3;

export default function(battles) {
  const fighters = [];

  for (const battle of battles) {
    for (const fighter of battle.fighters) {
      if (fighter.assignee && fighter.assignee.body.isGround) {
        fighters.push(fighter);
      }
    }
  }

  for (let i = 0; i < fighters.length; i++) {
    const a = fighters[i];

    for (let j = i + 1; j < fighters.length; j++) {
      const b = fighters[j];

      if (a.battle === b.battle) continue;

      const ab = a.assignee.body;
      const bb = b.assignee.body;

      const dx = bb.x - ab.x;
      const dy = bb.y - ab.y;
      const squareDistance = dx * dx + dy * dy;

      if (squareDistance > SWAP_DISTANCE * SWAP_DISTANCE) continue;

      // Check that both warriors move toward each other: dot product of their facing vector with the vector toward the other must be positive
      if ((Math.cos(ab.direction) * dx + Math.sin(ab.direction) * dy) <= 0) continue;
      if ((Math.cos(bb.direction) * dx + Math.sin(bb.direction) * dy) >= 0) continue;

      a.swap(b);
    }
  }
}
