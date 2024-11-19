
export default function(battle) {
  for (const fighter of battle.fighters) {
    fighter.priority = battle.priority;
  }
}
