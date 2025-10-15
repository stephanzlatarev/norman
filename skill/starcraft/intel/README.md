Intel skills collect data about the enemy to inform strategic military and production decisions.

### Detect enemy rush

Monitors enemy army for the first 5 minutes for signs of rush or timing attack.
Raises `LevelEnemyRush` when suspecting an enemy attack with large army:
* 0 - Enemy rush is not expected
* 1 - Moderate enemy rush on one-base economy
* 2 - All-in enemy rush on mineral-only economy
* 3 - Extreme enemy rush with melee units and workers

### Early scout

The early scout is a worker sent to the enemy base at the start of the game.
It will:
* Test if enemy workers defend themselves. If not, it will kill as many as possible before countered by military units.
* Detect enemy expansion. If there's no expansion, it will block it as long as possible.

### Enemy army assessment

Constantly monitors military units tracking units in fog of war.
Raises `LevelEnemyArmySuperiority` as the ratio between enemy army and own army.
