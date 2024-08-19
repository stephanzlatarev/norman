import Mission from "../mission.js";
import Zone from "../map/zone.js";

export default class BattleTransferMission extends Mission {

  run() {
    const battles = [];

    for (const zone of Zone.list()) {
      if (zone.battle) battles.push(zone.battle);
    }

    for (const battle of battles) {
      for (const fighter of battle.fighters) {
        const warrior = fighter.assignee;
        if (!warrior) continue;

        // Transfer warriors that are in the zone of another battle
        if (warrior.zone === battle.zone) continue;
        let closerBattle = battles.find(one => ((fighter.priority <= one.priority) && (warrior.zone === one.zone)));
        if (closerBattle) {
          transferWarrior(warrior, closerBattle);
          continue;
        }

        // Transfer warriors that are in the zones of another battle and not in the zones of this battle
        if (battle.zones.has(warrior.zone)) continue;
        closerBattle = battles.find(one => ((fighter.priority <= one.priority) && one.zones.has(warrior.zone)));
        if (closerBattle) {
          transferWarrior(warrior, closerBattle);
          continue;
        }
      }
    }
  }

}

function transferWarrior(warrior, battle) {
  for (const fighter of battle.fighters) {
    if (!fighter.assignee && (fighter.agent.type.name === warrior.type.name)) {
      fighter.assign(warrior);
    }
  }
}
