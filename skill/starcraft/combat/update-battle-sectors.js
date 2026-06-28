/*
For each battle, sectors is the union of the horizon sectors of the front and rally zones.
The screen maps each sector to the influence weight of the battle over that sector.

When a sector belongs to only one battle, its weight is 1.0.
When a sector is shared between battles, weights are distributed proportionally to the inverse
of the squared distance between the sector and each battle's front sector, summing to 1.0.
If the sector is the front sector of a battle, that battle gets weight 1.0.
*/
export default function(battles) {
  if (battles.length === 1) {
    singleBattle(battles[0]);
  } else if (battles.length > 1) {
    multipleBattles(battles);
  }
}

function singleBattle(battle) {
  battle.sectors = new Set([...battle.front.horizon, ...battle.rally.sectors]);
  battle.screen = new Map();

  for (const sector of battle.sectors) {
    battle.screen.set(sector, 1.0);
  }
}

function multipleBattles(battles) {
  for (const battle of battles) {
    battle.sectors = new Set([...battle.front.horizon, ...battle.rally.sectors]);
    battle.screen = new Map();
  }

  const sectorClaims = new Map();

  for (let index = 0; index < battles.length; index++) {
    const front = battles[index].front.cell.sector;

    for (const sector of battles[index].sectors) {
      if (!sectorClaims.has(sector)) sectorClaims.set(sector, []);

      const dr = sector.row - front.row;
      const dc = sector.col - front.col;
      const distance = dr * dr + dc * dc;
      sectorClaims.get(sector).push({ index, distance });
    }
  }

  for (const [sector, claims] of sectorClaims) {
    if (claims.length === 1) {
      battles[claims[0].index].screen.set(sector, 1.0);
    } else {
      const frontClaim = claims.find(c => c.distance === 0);

      if (frontClaim) {
        battles[frontClaim.index].screen.set(sector, 1.0);
      } else {
        const inverseDistances = claims.map(c => 1 / c.distance);
        const total = inverseDistances.reduce((a, b) => a + b, 0);

        for (let i = 0; i < claims.length; i++) {
          battles[claims[i].index].screen.set(sector, inverseDistances[i] / total);
        }
      }
    }
  }
}
