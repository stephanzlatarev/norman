import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Map from "../map/map.js";

export default class PatrolFrontierMission extends Mission {

  run() {
    if (!this.job) {
      this.job = new FrontierPatrol();
    }
  }

}

class FrontierPatrol extends Job {

  constructor() {
    super("Observer");

    this.priority = 100;
    this.frontier = null;
    this.zones = [];
    this.index = 0;
    this.direction = 1;
  }

  execute() {
    const frontier = findFrontier();
    if (!frontier) return;

    if (frontier !== this.frontier) {
      this.frontier = frontier;
      this.zones = [...frontier.zones].sort((a, b) => (a.x * b.y - a.y * b.x));
      this.index = 0;
    }

    const zone = this.zones[this.index];

    if (zone &&!isSamePosition(this.assignee.body, zone)) {
      return orderMove(this.assignee, zone);
    }

    if (this.zones.length === 1) {
      this.index = 0;
    } else {
      if ((this.direction === 1) && (this.index >= this.zones.length - 1)) {
        this.direction = -1;
      } else if ((this.direction === -1) && (this.index <= 0)) {
        this.direction = 1;
      }

      this.index += this.direction;
    }
  }

}

function findFrontier() {
  for (const tier of Map.tiers) {
    let isFrontier = false;

    for (const zone of tier.zones) {
      if (zone.buildings.size === 0) {
        isFrontier = true;
        break;
      }
    }

    if (isFrontier) return tier;
  }
}

function orderMove(observer, pos) {
  if (!observer || !observer.order || !pos) return;

  if ((observer.order.abilityId !== 16) || !observer.order.targetWorldSpacePos || !isSamePosition(observer.order.targetWorldSpacePos, pos)) {
    new Order(observer, 16, pos);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}
