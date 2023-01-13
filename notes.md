

============= MILESTONE 1 - Upgrade skills to work with memory

- add skill to expand base
  v select cluster for new base
  v start moving probe to cluster already at 300 minerals
  v at each step select free cluster closest to probe
  v when probe is at cluster location select the location to build the nexus - hard-code the locations for DATA-C map
  v then build the nexus
  v then remove the accomplished goal "build a nexus"
  - make sure the probe returns to harvesting
  - make sure the skill can build a 2nd, 3rd, etc nexus

- add skill "Plan economy" which monitors stats, manages quotas, and creates build goals.

- add skill to build gateway
- add skill to train zealot

- add skill to attack with army
- add skill to defend nexus with probes when facing worker rush

- test against norman's previous version & upload to arena

- fix: chronoboost doesn't work the second time. Check if command is properly queued
- fix: pylon location is changed during command. Check if command is properly queued. Check why issue more than one command.
- fix: probe building pylon doesn't always go back to harvesting. Check why

============= MILESTONE 2a - Use stalkers in army

- improve skill "know how to select mineral field for harvest" to select the mineral field that is closest to nexus and then closest to probe

- improve skill "build a pylon" with goal sequence "Select nexus", "Map area around nexus", "Select location", "Select builder"

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

- when detaching the game make related goals disappear
- remove memory nodes for detached bodies
- when a goal completes and is removed, then remove all its memory traces
- optional and provisional paths for memory layers should tell which part is optional or provisional, e.g. { path: [GOAL, has, SUBGOAL], provision: [has, SUBGOAL] } to provision a node and link to it but { path: [PROBE, go, DIRECTION], provision: [go] } to provision link to an existing node.
- see if check for unchanged memory for skill pattern will speed up skill "assign-probe-to-mineral-field"
  or check if can replace it with "know when to manage probes"?
- when a new nexus is created, take the probes which harvest distant mineral fields and redirect them to harvest the closest mineral fields of the new nexus
