
============= MILESTONE 3 - Event-based memory

- military.js should switch attention between two enemies only if second one is at least 10 closer to homebase

- more than one sentry uses guardian shield because when distance is smaller the new choice uses the shield but the old one still uses the shield too.

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
- add skill to balance quotas for units - probes, zealots, stalkers
- refactor skills "select nexus" to "select base"
