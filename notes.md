
============= MILESTONE 3 - Reach ELO 1600 in StarCraft II

- try rotation mining. Probes which have just returned harvest are queued to mineral fields which will be free at the time of arrival of the probes. Notes:
  - body observe monitors how many workers are needed to harvest minerals and vespene depending on the available mineral fields and assimilators.
  - skill assigns workers as harvesters to nexus. body skill is responsible to queue the workers to the free resources.
  - when a new assimilator is created the body skill will assign one worker immediately, then the second worker will be assigned just in time for its arrival.
  - speed mining works when two probes are in 0.1 distance from each other and move (abilityId: 16) at the same time for at least one game loop. This accelerates the probe returning harvest immediately and reduces the time to reach the nexus by 10 game loops. However, it has to be done exactly when this probe switches fromt ability 298 to 299. It also loses one game loop of harvest time for the other probe. Overall, check whether circle path of several probes over several mineral fields to better utilize the harvest time for mineral fields of all distances would yield better results.
- add learning skill for micro-managing fights. It works on given "fight flags" in memory with zoomed-in heatmap.
- convert "plan investments" skills to learning skill

============= MILESTONE 4 - Add ability to train skills with samples given in the Web UI

- Store playbooks with each learning skill
- Visualize inputs to selected skill in body/monitor. Allow to pause, step forward and step back
- Create playbook move for input as visualzied in body/monitor
- Train brain on playbooks with mirrors described in the descriptor of the skill. Duplicates and conflicts are removed

============= MILESTONE 5 - Add Gherkin to describe skills. Internally convert to the json description

Example: **x**  _is_  **zealot**, **x**'s  _health_  is  **100**, **x**  _busy_  **yes**.

============= MILESTONE 6 - Match skills to goals by outcomes instead of by label

============= MILESTONE 7 - Self-learning
Each skill knows what outcomes it promises. It will know what the likelihood for successfully delivering the outcomes is. When in use we can see if the observed success rate deviates from the expected success rate.
When so, extract samples of failure and add them to the learning set. It can ask supervisor for suggested reaction, or it can experiment.

============= MILESTONE 8 - Compose and decompose skills
Each skill can be decomposed to sub-skills.
Demonstrate by decomposing starcraft/deploy-troops to independently learnable and practiced skills "attack", "defend", "destroy", "scout", "bluff", etc.


============= FIXES & IMPROVEMENTS

- restore mothership time-warp ability
- improve sentry guardian-shield ability to optimize impact
- add 2nd and 3rd level air weapons and armor upgrades
- check for range of enemy and stay away from that range when stalking
- when detaching the game make related goals disappear
- remove memory nodes for detached bodies
- when a goal completes and is removed, then remove all its memory traces
- a nexus built at the place of a destroyed nexus should reconnect to left-over structures
  
- add memory test that memory doesn't send events for a removed memory node. A pattern doesn't return it as a match. A pattern doesn't create it with pattern.write() for either info on the node, or info on a label of the node, or a path with the node. 
- add pattern test when a matching root node is found, then all its shoots get procedures to detect breakage of the match
- add pattern test when a node is candidate root but not a complete match, then all its shoots get procedures to detect completion of the match
- add pattern test when a match or cnadidate root node is deleted, then all its shoots lose the procedures
- add pattern test on notifications. pause and resume non embeded and embeded. check that when paused then no notifications are sent and that after resume the blocked notifications are sent
- add pattern test that when there are two matches then no new memory node is created on write
- add test when pattern node has attributes other than the label and identiying a root depends on type EVENT_UPDATE_NODE event, e.g. Nodes: {"GOAL":{"label":"Greet","goal":true}}
- [test node.js] add test for one node link to another. when removing the second node, the first one should lose the link. Use "removed" field on the node and check for it when get returns such a node
- add test when pattern match is made after satisfying a path starting with a root node
- add test when pattern match is made after satisfying a path starting with a non-root node
- add test when pattern match disappears after : 1) removing a root node 2) changing link of a root node 3) changing link of a path node. Add variants: A) info is on a root node B) info is on path node
- add test when one path will select one non-root node and another path will select another node for the same node key. The result should not be included in the matches.
- add pattern test and improve pattern.addProcedure from pattern.fix - should remove previously added procedures. should not create duplicate procedures for the same node. Maybe allow pattern.fix without procedures, because skill doesn't need updates on the fixture nodes as they will be recycled anyway.
- add method to patterns to use given model so that nodes created by a pattern.write() are created in the correct model.
- memory to remember what labels each pattern is interested in and ivoke onChange only for those labels
- procedures in patterns for nodes to not copy but refer to master list of procedures
