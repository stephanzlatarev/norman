

============= MILESTONE 1 - Upgrade skills to work with memory

- add skill to expand base

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
- split memory.js to classes

- see if check for unchanged memory for skill pattern will speed up skill "assign-probe-to-mineral-field"
  or check if can replace it with "know when to manage probes"?
