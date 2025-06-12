Intel skills collect data about the enemy to inform strategic military and production decisions.

### Detect enemy rush

Monitors enemy army for the first 5 minutes for signs of rush or timing attack.
Raises `ExpectEnemyRush` when suspecting an enemy attack with large army.

### Early scout

The early scout is a worker sent to the enemy base at the start of the game.
It will:
* Test if enemy workers defend themselves. If not, it will kill as many as possible before countered by military units.
* Detect enemy expansion. If there's no expansion, it will block it as long as possible.

### Enemy army assessment

Constantly monitors military units tracking units in fog of war.
Raises `EnemyArmyIsSuperior` when enemy capacity for offense is at least 50% stronger than our capacity for defense.
