
export default function(battle, isFocusBattle) {
  const priority = isFocusBattle ? 99 : battle.priority;

  for (const fighter of battle.fighters) {
    fighter.priority = priority;
  }
}
