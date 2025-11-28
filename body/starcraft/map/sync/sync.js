import Board from "../board.js";
import { syncAlerts } from "./alert.js";
import { syncEffects } from "./effects.js";

export default function (gameInfo, observation) {
  Board.sync(gameInfo);

  syncEffects(observation);
  syncAlerts();
}
