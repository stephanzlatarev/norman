
- when detaching the game make related goals disappear
- remove memory nodes for detached bodies
- split memory.js to classes

- add skill to build pylon
  - skill "Know how to win" for goal "Destroy enemy" produces goal "Build strength"
  - skill "Know when to build a pylon" for goal "Build strength" produces goal "Build a pylon"
  - skill "Know where to build a pylon" for goal "Build a pylon" produces goal sequence "Select nexus", "Map area around nexus", "Select location", "Select builder"
  - skill "Select location to build a pylon" for goal "Select location"-to->"Build a pylon" enhances goal with a location
  - skill "Select builder" for goal "Select builder"(-to->"Build a pylon") with a location enhaces goal with a probe
  - skill "Build a pylon" for goal "Build a pylon" when with a location and a probe, issues the command to build the probe
-> Detect when a goal is complete and close it together with memory traces

- add skill to expand base

- add skill to build gateway
- add skill to train zealot

- add skill to build assimilator
- add skill to harvest vespene gas
- add skill to build cybernetics core
- add skill to train stalker

- add skill to attack with army
- add skill to defend nexus with probes when facing worker rush

- add skill to balance quotas

- see if check for unchanged memory for skill pattern will speed up skill "assign-probe-to-mineral-field"
  or check if can replace it with "know when to manage probes"?
