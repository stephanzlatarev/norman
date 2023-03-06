
============= MILESTONE 2 - Reach ELO 1600 in StarCraft II

============= MILESTONE 3 - Event-based memory

- body/monitor to show count of memory nodes/neurons, and count by type (goal, skill, body)

- add stats body to print every second cpu usage for top 5 skills, as milliseconds and percentage, as well as overall norman.js cpu usage, as millis and percentage. Activate the stats for the arena games.

- replace memory nodes with neurons. A neuron can only store data one value fiels and in labeled links to other neurons. Example: **x**  _is_  **zealot**, **x**'s  _health_  is  **100**, **x**  _busy_  **yes**. There are special nodes "yes" (=true), "no" (=false), "void" (=null/undefined).  

- make use of memory to be based on events. Goals are not active. Skills listen for changes affecting their patterns and make updates (detect infinite loops within one tick-tock cycle). Bodies make pulses (previously tick/tock), reflect their state into memory, listen for changes on their nodes, and when the pulse is over making changes then apply any resulting changes in memory to the external body.
  In starcraft, there will be only one body - the game. Previous bodies like a "probe" will be represented by a neuron. Orders will be translated to links between neurons. Links between neurons will be translated to action commands.

- norman closes when all bodies have detached. In the arena, when the game is over then norman will exit. When testing with a monitor, norman will never exit.

============= MILESTONE 4 - Add ability to train skills with samples given in the Web UI

============= MILESTONE 5 - Add Gherkin to describe skills. Internally convert to the json description

============= MILESTONE 6 - Match skills to goals by outcomes instead of by label

============= MILESTONE 7 - Self-learning
Each skill knows what outcomes its promises. It will know what is the likelyhood for successfully delivering the outcomes. When in use we can see if the observed success rate deviates from the expected success rate.
When so, extract samples of failure and add them to the learning set. It can ask supervisor for suggested reaction, or it can experiment.

============= FIXES & IMPROVEMENTS

- add 2nd and 3rd level air weapons and armor upgrades
- check for range of enemy and stay away from that range when stalking
- military.js to observe alpha (leader, x, y) and bravo (leader, x, y) army where alpha is between homebase and enemy and bravo is on the other side of the enemy. Rally units accordingly. Attack with alpha and bravo at the same time
- add DEBUG and INFO log option for starcraft/unit
- when detaching the game make related goals disappear
- remove memory nodes for detached bodies
- when a goal completes and is removed, then remove all its memory traces
- optional and provisional paths for memory layers should tell which part is optional or provisional, e.g. { path: [GOAL, has, SUBGOAL], provision: [has, SUBGOAL] } to provision a node and link to it but { path: [PROBE, go, DIRECTION], provision: [go] } to provision link to an existing node.
- see if check for unchanged memory for skill pattern will speed up skill "assign-probe-to-mineral-field"
  or check if can replace it with "know when to manage probes"?
- when a new nexus is created, take the probes which harvest distant mineral fields and redirect them to harvest the closest mineral fields of the new nexus
- improve skill "know how to select mineral field for harvest" to select the mineral field that is closest to nexus and then closest to probe
- improve skill "build a pylon" with goal sequence "Select nexus", "Map area around nexus", "Select location", "Select builder"
- add a "guard" body to help defending the base
  - the guard line should be a walking path close to all own nexuses
  - the guard line will be pylons and cannons which secure end-to-end visibility
  - the guard line is used to rally army when stalking
  - enemy attacking a guard triggers "enemy alert"
- add skill "manage military operations" with goals "defend", "stalk", "push", "attack"
  - split combat units among "guard", "scouts", "army", "fleet"
  - total attack should consider strength of units - one carrier is better than one zealot
- sometimes army rallies to a stalking point at the side of the enemy (maybe because there is own unit there) but the rest of the units need to walk pass the enemy to get there. Make sure stalking location is always in the direction of the base, so it is always in a path between the base and the enemy.
- a nexus built at the place of a destroyed nexus should reconnect to left-over structures
- more than one sentry uses guardian shield because when distance is smaller the new choice uses the shield but the old one still uses the shield too.
