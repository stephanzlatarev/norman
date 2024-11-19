import Detect from "../jobs/detect.js";

export default function(battle) {
  if (battle.lines.length && battle.fighters.find(fighter => !!fighter.assignee)) {
    // At least one fighter is assigned. We need detection
    if (!battle.detector || battle.detector.isDone || battle.detector.isFailed) {
      battle.detector = new Detect(battle);
    }
  } else {
    // No fighters are assigned. We don't need detection yet
    if (battle.detector) {
      battle.detector.close(true);
      battle.detector = null;
    }
  }
}
