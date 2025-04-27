import Mission from "../mission.js";
import Order from "../order.js";
import Units from "../units.js";
import Board from "../map/board.js";
import { ActiveCount } from "../memo/count.js";
import Resources from "../memo/resources.js";

const LOOPS_PER_SECOND = 22.4;
const BLINK_COOLDOWN_LOOPS = LOOPS_PER_SECOND * 7.2;
const MIN_BLINK_SQUARE_DISTANCE = 3 * 3;
const MAX_BLINK_DISTANCE = 6;
const MAX_BLINK_SQUARE_DISTANCE = MAX_BLINK_DISTANCE * MAX_BLINK_DISTANCE;

const blinks = new Map();

export default class BlinkStalkerMission extends Mission {

  run() {
    if (!ActiveCount["BlinkTech"]) return;

    for (const warrior of Units.warriors().values()) {
      if (!warrior.order.targetWorldSpacePos) continue;
      if (warrior.type.name !== "Stalker") continue;
      if (!canBlink(warrior)) continue;

      const target = getBlinkLocation(warrior);

      if (target) {
        new Order(warrior, 1442, target).accept(true);

        blinks.set(warrior, Resources.loop + BLINK_COOLDOWN_LOOPS);
      }
    }
  }

}

function canBlink(warrior) {
  const blinkNotBefore = blinks.get(warrior);

  return (!blinkNotBefore || (Resources.loop >= blinkNotBefore));
}

function getBlinkLocation(warrior) {
  const location = warrior.body;
  let target = warrior.order.targetWorldSpacePos;

  const squareDistance = calculateSquareDistance(location, target);

  if (squareDistance < MIN_BLINK_SQUARE_DISTANCE) return;

  if (squareDistance > MAX_BLINK_SQUARE_DISTANCE) {
    const distance = Math.sqrt(squareDistance);

    target = {
      x: location.x + (target.x - location.x) * MAX_BLINK_DISTANCE / distance,
      y: location.y + (target.y - location.y) * MAX_BLINK_DISTANCE / distance,
    };
  }

  const cell = Board.cell(target.x, target.y);
  if (!cell.isObstructed()) {
    return cell;
  }
}

function calculateSquareDistance(a, b) {
  return (a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y);
}
