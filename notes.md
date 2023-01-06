
- when detaching the game make related goals disappear
- remove memory nodes for detached bodies
- when a goal completes and is removed, then remove all its memory traces
- split memory.js to classes

=============

- change skill "assign-probe-to-mineral-field" to goal "Collect minerals" with skill "Know when a probe is idle" to produce goal "Harvest a mineral field" for this idle probe and the closest underutilized mineral field (goal "Select closest underutilized mineral field")

- add skill to expand base

- improve skill "build one pylon"
  - use goal sequence "Select nexus", "Map area around nexus", "Select location", "Select builder"

- add skill to build gateway
- add skill to train zealot

- add skill to attack with army
- add skill to defend nexus with probes when facing worker rush

- test against norman's previous version

- add skill to build assimilator
- add skill to harvest vespene gas
- add skill to build cybernetics core
- add skill to train stalker

- add skill to balance quotas

=============

- see if check for unchanged memory for skill pattern will speed up skill "assign-probe-to-mineral-field"
  or check if can replace it with "know when to manage probes"?
