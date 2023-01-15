

============= MILESTONE 1 - Upgrade skills to work with memory

- add skill to scout with zealots. Send one zealot to each resource cluster
- add skill to attack with army

- add skill to defend nexus with probes when facing worker rush. Probes will attack only if an enemy unit attacks their nexus or them. Always attack with two probes against one enemy unit

fix:
  - chronoboost doesn't work the second time. Check if command is properly queued
  - pylon location is changed during command. Check if command is properly queued. Check why issue more than one command.
  - probe building pylon doesn't always go back to harvesting. Check why
  - "build probe" skill sets "game/minerals" to nexuses

check list:
  - probes are built when enough free psi and when there are less than 16 per nexus. probes cannot be more than 16 x 4 = 64
  - new pylons are created when needed free psi is less than 8
  - new expansion nexuses are created when there are enough minerals
  - all probes harvest minerals. when a new probe is trained it is assigned a mineral. when a probe finishes building, it returns to its mineral
  - chronoboost is always used for all nexuses
  - the count of gateways matches the speed of gathering resources
  - zealots are trained when there are minerals
  - army scouts when enemy is not in sight
  - army attacks when enemy is in sight
  - worker rush is countered
  - expansion locations for all arena maps
  - no crashes vs old norman and vs lucid when playing in arena

upload to arena

============= MILESTONE 2a - Use stalkers in army

- improve skill "know how to select mineral field for harvest" to select the mineral field that is closest to nexus and then closest to probe

- improve skill "build a pylon" with goal sequence "Select nexus", "Map area around nexus", "Select location", "Select builder"

- add skill "Plan economy" which monitors stats, manages quotas, and creates build goals.

============= MILESTONE 2b - Use stalkers in army

- add skill to build assimilator
- add skill to harvest vespene gas
- add skill to build cybernetics core
- add skill to train stalker
- use stalkers in the army

- test against norman's previous version & upload to arena

============= MILESTONE 3 - Add ability to train skills with samples given in the Web UI

============= MILESTONE 4 - Add skill to balance quotas for units - probes, zealots, stalkers

- add skill to balance quotas

============= MILESTONE 5 - Add Gherkin to describe skills. Internally convert to the json description

============= MILESTONE 7 - Match skills to goals by outcomes instead of by label

============= FIXES & IMPROVEMENTS

- add DEBUG and INFO log option for starcraft/unit
- when detaching the game make related goals disappear
- remove memory nodes for detached bodies
- when a unit dies, check if its node is removed and that any links to it are removed
- when a goal completes and is removed, then remove all its memory traces
- optional and provisional paths for memory layers should tell which part is optional or provisional, e.g. { path: [GOAL, has, SUBGOAL], provision: [has, SUBGOAL] } to provision a node and link to it but { path: [PROBE, go, DIRECTION], provision: [go] } to provision link to an existing node.
- see if check for unchanged memory for skill pattern will speed up skill "assign-probe-to-mineral-field"
  or check if can replace it with "know when to manage probes"?
- when a new nexus is created, take the probes which harvest distant mineral fields and redirect them to harvest the closest mineral fields of the new nexus
