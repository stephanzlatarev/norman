import { memory } from "../nodejs/memory.js";

import hack from "./hack.js";

export default class Observer {

  constructor() {
    memory.set("time", time.bind(this));
    memory.set("mode", "explore");

    memory.set("minerals", minerals.bind(this));
    memory.set("minerals.closest", mineralsClosest.bind(this));

    memory.set("food.cap", foodCap.bind(this));
    memory.set("food.used", foodUsed.bind(this));

    memory.set("nexus.count", nexusCount.bind(this));
    memory.set("nexus.slot", nexusSlot.bind(this));
    memory.set("nexus.idle", nexusIdle.bind(this));
    memory.set("nexus.ready", nexusReady.bind(this));

    memory.set("probes.count", probesCount.bind(this));
    memory.set("probes.idle", probesIdle.bind(this));

    memory.set("pylon.count", pylonCount.bind(this));
    memory.set("pylon.slot", pylonSlot.bind(this));

    memory.set("gateway.count", gatewayCount.bind(this));
    memory.set("gateway.slot", gatewaySlot.bind(this));
    memory.set("gateway.idle", gatewayIdle.bind(this));
    memory.set("gateway.idle.count", gatewayIdleCount.bind(this));
    memory.set("gateway.ready", gatewayReady.bind(this));

    memory.set("zealot.count", zealotCount.bind(this));
    memory.set("zealot.idle", zealotIdle.bind(this));

    memory.set("army.count", armyCount.bind(this));
    memory.set("enemy.count", enemyCount.bind(this));
  }

  async observe(client) {
    this.observation = (await client.observation()).observation;

    if (this.owner === undefined) {
      const gameInfo = await client.gameInfo();

      const mainBase = this.observation.rawData.units.find(unit => unit.unitType === 59);
      memory.ref(mainBase.tag);
      memory.set("mainbase.x", mainBase.pos.x);
      memory.set("mainbase.y", mainBase.pos.y);
      memory.set("mainbase.radius", mainBase.radius);

      const probes = this.observation.rawData.units.filter(unit => unit.unitType === 84);
      memory.ref(probes[0].tag); // Builder of nexus is "refs/1"
      memory.ref(probes[1].tag); // Builder of pylon is "refs/2"
      memory.ref(probes[2].tag); // Builder of gateway is "refs/3"

      this.owner = mainBase.owner;

      for (const player of gameInfo.playerInfo) {
        if (this.owner !== player.playerId) {
          this.enemy = player.playerId;
          break;
        }
      }

      memory.set("rally.x", mainBase.pos.x);
      memory.set("rally.y", mainBase.pos.y);

      if (gameInfo.startRaw.startLocations.length) {
        memory.set("enemybase.x", gameInfo.startRaw.startLocations[0].x);
        memory.set("enemybase.y", gameInfo.startRaw.startLocations[0].y);
      }
      memory.set("enemy.army", 0);
    }

    const getNexusCount = nexusCount.bind(this);
    const getProbeCount = probesCount.bind(this);
    const getZealotCount = zealotCount.bind(this);
    memory.set("game over", (!getNexusCount() || (getProbeCount() + getZealotCount() === 0)));

    let mode = "explore";
    const nexus = this.observation.rawData.units.find(unit => (unit.tag === memory.get("ref/0")));
    const enemyUnits = this.observation.rawData.units.filter(unit => (!unit.isFlying && (unit.owner === this.enemy)));
    enemyUnits.sort((a, b) => {
      const da = (a.pos.x - nexus.pos.x) * (a.pos.x - nexus.pos.x) + (a.pos.y - nexus.pos.y) * (a.pos.y - nexus.pos.y);
      const db = (b.pos.x - nexus.pos.x) * (b.pos.x - nexus.pos.x) + (b.pos.y - nexus.pos.y) * (b.pos.y - nexus.pos.y);
      return da - db;
    });
    const enemyUnit = enemyUnits.length ? enemyUnits[0] : null;

    const zealots = this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 73)));
    zealots.sort((a, b) => a.tag.localeCompare(b.tag));
    if (enemyUnit) {
      memory.set("enemy.x", enemyUnit.pos.x);
      memory.set("enemy.y", enemyUnit.pos.y);
      memory.set("enemy.army", Math.min(Math.max(enemyUnits.length, memory.get("enemy.army")), 15));
      mode = "attack";

      if (!zealots.length && (getNexusCount() === 1)) {
        const nexus = this.observation.rawData.units.find(unit => unit.unitType === 59);
        if (Math.abs(nexus.pos.x - enemyUnit.pos.x) + Math.abs(nexus.pos.y - enemyUnit.pos.y) < 50) {
          mode = "defend";
        }
      }
    } else if (memory.get("enemy.x") && zealots.length) {
      const enemyX = memory.get("enemy.x");
      const enemyY = memory.get("enemy.y");
      let isEnemyLocationReached = false;
      for (const zealot of zealots) {
        if ((Math.abs(zealot.pos.x - enemyX) < 2) && (Math.abs(zealot.pos.y - enemyY) < 2)) {
          isEnemyLocationReached = true;
          break;
        }
      }
      if (isEnemyLocationReached) {
        // Zealots are there but there is no enemy in sight. Go back to exploring...
        memory.set("enemy.x", null);
        memory.set("enemy.y", null);
        mode = "explore";
      } else {
        mode = "attack";
      }
    }

    if (mode === "attack") {
      const leader = hack.pickZealotLeader(this.observation, this.owner);
      const leaderX = leader ? leader.pos.x : nexus.pos.x;
      const leaderY = leader ? leader.pos.y : nexus.pos.y;

      let armySize = 0;
      for (const zealot of zealots) {
        if ((Math.abs(zealot.pos.x - leaderX) < 10) && (Math.abs(zealot.pos.y - leaderY) < 10)) {
          armySize++;
        }
      }

      if (leader) {
        memory.set("rally.leader", leader.tag);
      } else {
        memory.clear("rally.leader");
      }
      memory.set("rally.x", leaderX);
      memory.set("rally.y", leaderY);

      if (armySize > memory.get("enemy.army")) {
        mode = "attack";
      } else {
        mode = "rally";
      }
    }

    if ((mode !== "defend") && (memory.get("mode") === "defend")) {
      const probes = this.observation.rawData.units.filter(unit => (unit.owner === this.owner) && (unit.unitType === 84));
      if (!probes.find((probe) => (probe.tag === memory.get("ref/1")))) memory.set("ref/1", probes[0].tag); // Builder of nexus is "refs/1"
      if (!probes.find((probe) => (probe.tag === memory.get("ref/2")))) memory.set("ref/2", probes[1].tag); // Builder of pylon is "refs/2"
      if (!probes.find((probe) => (probe.tag === memory.get("ref/3")))) memory.set("ref/3", probes[2].tag); // Builder of gateway is "refs/3"

      for (const probe of probes) memory.clear("assignments/" + probe.tag);
      for (const resource of hack.getAllResources(this.observation)) memory.clear("assignments/" + resource.tag);
    }

    memory.set("mode", mode);
  }

  getUnit(tag) {
    return this.observation.rawData.units.find(unit => (unit.tag === tag));
  }

  situation() {
    const context = [
      ...this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 84))),
      ...this.observation.rawData.units.filter(unit => ((unit.owner !== this.owner) && !unit.isFlying)),
    ];
    const situation = [];

    for (const unit of context) {
      situation.push({
        tag: unit.tag,
        owner: unit.owner,
        x: unit.pos.x,
        y: unit.pos.y,
      });
    }

    return situation;
  }
}

function time() {
  return this.observation.gameLoop;
}

function minerals() {
  return this.observation.playerCommon.minerals;
}

function mineralsClosest() {
  return memory.ref(hack.pickClosestFreeMineralField(this.observation, this.owner));
}

function foodCap() {
  return this.observation.playerCommon.foodCap;
}

function foodUsed() {
  return this.observation.playerCommon.foodUsed;
}

function nexusCount() {
  return this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 59))).length;
}

function nexusSlot() {
  return hack.pickFreeLocationForNexus(this.observation, this.owner);
}

function nexusIdle() {
  return memory.ref(hack.pickIdleNexus(this.observation, this.owner));
}

function nexusReady() {
  const nexus = this.observation.rawData.units.find(function(unit) {
    return (unit.owner === this.owner) && (unit.unitType === 59) && (unit.buildProgress >= 1) && (unit.energy >= 50);
  }.bind(this));

  if (nexus) {
    return memory.ref(nexus.tag);
  }
}

function probesCount() {
  return this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 84))).length;
}

function probesIdle() {
  return memory.ref(hack.pickIdleProbe(this.observation, this.owner));
}

function pylonCount() {
  return this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 60))).length;
}

function pylonSlot() {
  return hack.pickFreeLocationForPylon(this.observation, this.owner);
}

function gatewayCount() {
  return this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 62))).length;
}

function gatewaySlot() {
  return hack.pickFreeLocationForGateway(this.observation, this.owner);
}

function gatewayIdle() {
  return memory.ref(hack.pickIdleGateway(this.observation, this.owner));
}

function gatewayIdleCount() {
  return this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 62) && (unit.buildProgress === 1) && !unit.orders.length)).length;
}

function gatewayReady() {
  const gateway = this.observation.rawData.units.find(function(unit) {
    return (unit.owner === this.owner) && (unit.unitType === 62) && (unit.buildProgress >= 1);
  }.bind(this));

  if (gateway) {
    return memory.ref(gateway.tag);
  }
}

function zealotCount() {
  return this.observation.rawData.units.filter(unit => ((unit.owner === this.owner) && (unit.unitType === 73))).length;
}

function zealotIdle() {
  return memory.ref(hack.pickIdleZealot(this.observation, this.owner));
}

function enemyCount() {
  return this.observation.rawData.units.filter(unit => (!unit.isFlying && (unit.owner === this.enemy))).length;
}

function armyCount() {
  return hack.countArmy(this.observation, this.owner);
}
