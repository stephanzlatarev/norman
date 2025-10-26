import Line from "../battle/line.js";

// TODO: Target solution is to select 1-3 approaches (battle lines) between the rally point and the target point.
// The main army will be stationed at the rally point, while watchmen will be stationed at the approaches to detect enemy movements.
// The current solution is a very simplified version - one battle line is at the rally point and all warriors are stationed there.
export default function(battle) {
  if (battle.front.size) {
    const zone = [...battle.front][0];

    if (!battle.lines.length || !battle.lines.some(one => (one.zone === zone))) {
      battle.lines = [new Line(battle, zone)];
    }
  } else {
    battle.lines = [];
  }
}
