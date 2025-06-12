import { Memory, Resources, Units, VisibleCount } from "./imports.js";

const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;
const LOOPS_TWO_MINUTES = LOOPS_PER_MINUTE * 2;
const TIER_DEFENSIVE = 8;

export default function() {
  if (Memory.DetectedEnemyDefensiveStance) return;

  if (Resources.loop > LOOPS_TWO_MINUTES) {
    // Can't detect enemy defensive stance after the first 2 minutes
    Memory.DetectedEnemyDefensiveStance = false;
  } else if (isEnemyStructureDefensive("Bunker", VisibleCount.Bunker)) {
    console.log("Detected enemy defensive stance: Bunker");
    Memory.DetectedEnemyDefensiveStance = true;
  } else if (isEnemyStructureDefensive("PhotonCannon", VisibleCount.PhotonCannon)) {
    console.log("Detected enemy defensive stance: Photon Cannon");
    Memory.DetectedEnemyDefensiveStance = true;
  } else {
    Memory.DetectedEnemyDefensiveStance = false;
  }
}

function isEnemyStructureDefensive(type, count) {
  if (!count) return false;

  for (const unit of Units.enemies().values()) {
    if (!unit.zone) continue;
    if ((unit.type.name === type) && (unit.zone.tier.level > TIER_DEFENSIVE)) return true;
  }

  return false;
}
