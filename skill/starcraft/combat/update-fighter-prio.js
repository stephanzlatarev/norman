
export default function(battle) {
  const priority = battle.isFocusBattle ? 99 : battle.priority;

  for (const fighter of battle.fighters) {
    fighter.priority = priority;
  }
}
