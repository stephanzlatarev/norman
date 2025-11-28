import Board from "../board.js";
import Sector from "../sector.js";
import Zone from "../zone.js";

export function syncEffects(observation) {
  for (const sector of Sector.list()) sector.clearEffects();
  for (const zone of Zone.list()) zone.clearEffects();

  for (const effect of observation.rawData.effects) {
    for (const pos of effect.pos) {
      const sector = Board.sector(pos.x, pos.y);
      const zone = Board.zone(pos.x, pos.y);
      const data = {
        x: pos.x,
        y: pos.y,
        effect: effect.effectId,
        owner: effect.owner,
        radius: effect.radius
      };

      if (zone) zone.addEffect(data);
      if (sector) sector.addEffect(data);
    }
  }
}
