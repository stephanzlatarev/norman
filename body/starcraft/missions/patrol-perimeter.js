import Job from "../job.js";
import Mission from "../mission.js";
import Order from "../order.js";
import Zone from "../map/zone.js";

export default class PatrolPerimeterMission extends Mission {

  job = new FrontierPatrol();

  run() {
  }

}

class FrontierPatrol extends Job {

  constructor() {
    super("Observer");

    this.priority = 60;
    this.direction = 1;
  }

  execute() {
    const observer = this.assignee;

    if (!isPerimeter(this.zone)) {
      this.zone = Zone.list().find(isPerimeter);
    } else if (isSamePosition(observer.body, this.zone)) {
      const perimeter = Zone.list().filter(isPerimeter).sort((a, b) => (a.x * b.y - a.y * b.x));

      if (perimeter.length === 0) {
        this.zone = null;
      } else if (perimeter.length === 1) {
        this.zone = perimeter[0];
      } else {
        const index = perimeter.indexOf(this.zone) + this.direction;

        if (index < 0) {
          this.zone = perimeter[1];
          this.direction = 1;
        } else if (index >= perimeter.length) {
          this.zone = perimeter[perimeter.length - 2];
          this.direction = -1;
        } else {
          this.zone = perimeter[index];
        }
      }
    }

    if (this.zone) {
      orderMove(observer, this.zone);
    }
  }

}

function isPerimeter(zone) {
  return zone && !zone.threats.size && (zone.buildings.size || zone.warriors.size);
}

function orderMove(observer, pos) {
  if (!observer || !observer.order || !pos) return;
  if (isSamePosition(observer.body, pos)) return;

  if ((observer.order.abilityId !== 16) || !observer.order.targetWorldSpacePos || !isSamePosition(observer.order.targetWorldSpacePos, pos)) {
    new Order(observer, 16, pos);
  }
}

function isSamePosition(a, b) {
  return (Math.abs(a.x - b.x) < 1) && (Math.abs(a.y - b.y) < 1);
}
