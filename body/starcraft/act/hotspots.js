
const FIGHT_RANGE = 16;

// The minimum considered troops deployment value
const DEPLOYMENT_THRESHOLD = 0.001;

export class Hotspots {

  constructor(grid, heatscale) {
    this.grid = grid;
    this.heatscale = heatscale;

    this.heatmap = {};
    this.hotspots = [];
  }

  atHeatmapPosition(heatmapPosition, shouldCreateIfMissing) {
    let hotspot = this.heatmap[heatmapPosition];

    if (!hotspot && shouldCreateIfMissing) {
      hotspot = new Hotspot(this.grid, this.heatscale, heatmapPosition);

      this.heatmap[heatmapPosition] = hotspot;
      this.hotspots.push(hotspot);
    }

    return hotspot;
  }

  addWarrior(warrior) {
    this.atHeatmapPosition(warrior.heatmapPosition, true).addWarrior(warrior);
  }

  addEnemy(enemy) {
    this.atHeatmapPosition(enemy.heatmapPosition, true).addEnemy(enemy);
  }

  addDummy(dummy) {
    this.atHeatmapPosition(dummy.heatmapPosition, true).addDummy(dummy);
  }

  deploy(deployment) {
    for (const hotspot of this.hotspots) {
      hotspot.deploymentHeat = deployment[hotspot.spot];
    }

    const transports = createTransports(this.hotspots, createTroops(this.hotspots, this.heatscale));

    consolidateNearbyHotspots(this.hotspots, transports);

    const modes = calculateModeOfHotspots(this.hotspots);

    // TODO: Deploy support-mode hotspots to help adjacent defend-mode hotspots
    // Return any troops transported from these defend-mode hotspots to the support-mode hotspots. Are there any such

    // console.log(this.hotspots.map(h => h.warriors.length + " vs " + h.enemies.length + " / " + h.dummies.length).join(", "));

    return {
      ...modes,
      deploy: transports,
    };
  }

}

class Hotspot {

  constructor(grid, heatscale, spot) {
    this.spot = spot;
    this.heatscale = heatscale;

    this.x = spot % 10;
    this.y = Math.floor(spot / 10);

    this.bounds = {
      top: grid.top + grid.cellHeight * this.y,
      left: grid.left + grid.cellWidth * this.x,
      width: grid.cellWidth,
      height: grid.cellHeight,
    };

    this.pos = {
      x: this.bounds.left + grid.cellWidthHalf,
      y: this.bounds.top + grid.cellHeightHalf,
    };

    this.warriors = [];
    this.warriorHeat = 0;

    this.enemies = [];
    this.enemyHeat = 0;

    this.dummies = [];
  }

  include(other) {
    this.warriors.push(...other.warriors);
    this.warriorHeat += other.warriorHeat;

    this.enemies.push(...other.enemies);
    this.enemyHeat += other.enemyHeat;

    this.dummies.push(...other.dummies);
  }

  addWarrior(warrior) {
    this.warriors.push(warrior);
    this.warriorHeat += warrior.heatmapValue / this.heatscale;
  }

  removeWarrior(warrior) {
    if (this.warriors.length === 1) {
      this.warriors.length = 0;
      this.warriorHeat = 0;
    } else {
      this.warriors.splice(this.warriors.indexOf(warrior), 1);
      this.warriorHeat -= warrior.heatmapValue / this.heatscale;
    }
  }

  addEnemy(enemy) {
    this.enemies.push(enemy);
    this.enemyHeat += enemy.heatmapValue / this.heatscale;
  }

  addDummy(dummy) {
    this.dummies.push(dummy);

    if (!dummy.pos) {
      dummy.pos = this.pos;
    }
  }
}

function createTroops(hotspots, heatscale) {
  const troops = [];

  for (const hotspot of hotspots) {
    if (!hotspot.warriors.length || (hotspot.warriorHeat <= hotspot.deploymentHeat)) continue;

    let remainingHeat = (hotspot.warriorHeat - hotspot.deploymentHeat);
    if (remainingHeat < DEPLOYMENT_THRESHOLD) continue;

    for (const unit of hotspot.warriors) {
      if (remainingHeat < DEPLOYMENT_THRESHOLD) break;

      const heat = unit.heatmapValue / heatscale;
      if (!isEngaged(unit) && (heat <= remainingHeat)) {
        troops.push({ unit: unit, heat: heat, hotspot: hotspot });
        remainingHeat -= heat;
      }
    }
  }

  return troops;
}

function isEngaged(unit) {
  return !!unit.orders.length;
}

function createTransports(hotspots, troops) {
  const transports = [];
  if (!troops.length) return transports;

  const targets = hotspots.filter(one => (one.deploymentHeat > one.warriorHeat))
    .sort((a, b) => ((b.deploymentHeat - b.warriorHeat) - (a.deploymentHeat - a.warriorHeat)));

  for (const target of targets) {
    if (!troops.length) break;

    let remainingHeat = (target.deploymentHeat - target.warriorHeat);

    // TODO: Sort troops by distance to hotspot so that closest one get there
    for (let index = troops.length - 1; (remainingHeat > 0) && (index >= 0); index--) {
      const one = troops[index];

      transports.push({ unit: one.unit, pos: target.pos, from: one.hotspot.spot, to: target.spot });

      one.hotspot.removeWarrior(one.unit);
      troops.splice(index, 1);
      remainingHeat -= one.heat;
    }
  }

  return transports;
}

function consolidateNearbyHotspots(hotspots, transports) {
  hotspots.sort((a, b) => (b.warriorHeat - a.warriorHeat));

  for (let i = 0; i < hotspots.length; i++) {
    const center = hotspots[i];
    const satellites = {};

    satellites[center.spot] = true;

    // Make any hotspots within fighting range into satellites around this hotspot 
    for (let j = hotspots.length - 1; j > i; j--) {
      const satellite = hotspots[j];

      if (isInFightingRange(center, satellite)) {
        satellites[satellite.spot] = true;
        center.include(satellite);
        hotspots.splice(j, 1);
      }
    }

    // Return any troops transported within the satellites around this hotspot
    for (let j = transports.length - 1; j > i; j--) {
      const transport = transports[j];

      if (satellites[transport.from] && satellites[transport.from]) {
        center.addWarrior(transport.unit);
        transports.splice(j, 1);
      }
    }
  }
}

function isInFightingRange(a, b) {
  return (Math.abs(a.pos.x - b.pos.x) <= FIGHT_RANGE) && (Math.abs(a.pos.y - b.pos.y) <= FIGHT_RANGE);
}

function calculateModeOfHotspots(hotspots) {
  const modes = { attack: [], defend: [], destroy: [], support: [] };

  for (const hotspot of hotspots) {
    if (!hotspot.warriors.length) continue;

    if (hotspot.enemies.length) {
      if (hotspot.warriorHeat > hotspot.enemyHeat) {
        hotspot.mode = "attack";
      } else {
        hotspot.mode = "defend";
      }
    } else if (hotspot.dummies.length) {
      hotspot.mode = "destroy";
    } else {
      hotspot.mode = "support";
    }

    modes[hotspot.mode].push(hotspot);
  }

  return modes;
}
