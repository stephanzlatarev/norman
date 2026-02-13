import Board from "../board.js";
import { syncAlerts } from "./alert.js";
import { syncCurtains } from "./curtains.js";
import { syncEffects } from "./effects.js";
import { syncZones } from "./zones.js";

export default function (gameInfo, observation) {
  Board.sync(gameInfo);

  syncEffects(observation);
  syncZones();
  syncAlerts();

  syncCurtains();
}
