
export default function(battle, isFocusBattle) {
  const priority = isFocusBattle ? 100 : battle.priority;

  for (const fighter of battle.fighters) {
    fighter.priority = priority;
  }
}
