import starcraft from "@node-sc2/proto";

import { memory } from "../nodejs/memory.js";
import Observer from "./observer.js";

import Probe from "./probe.js";
import Brain from "../nodejs/brain.js";

const brain = new Brain("starcraft/probe");

export default class Game {

  constructor() {
    this.client = starcraft();
    this.observer = new Observer();
    this.actions = [];
  }

  async tick() {
    await this.client.step({ count: 1 });
    await this.observer.observe(this.client);
  }

  async perform(command, data) {
    if (command < 1) {
      // No action
    } else if (command < 2) {
      // Post a message in the chat
      this.actions.push({
        actionChat: {
          channel: 1,
          message: String.fromCharCode(...data)
        }
      });
    } else if (command < 3) {
      // Command a unit with [<unit tag>, <ability id>]
      const unitTag = memory.get("ref/" + data[0]);
      const unitCommand = {
        unitTags: [unitTag],
        abilityId: data[1],
        targetWorldSpacePos: undefined,
        queueCommand: false,
      };

      if (data[2] && data[3]) {
        // TODO: Fix this when you add the skill to select location from map. data[2] is x; data[3] is y
        if (data[1] === 881) {
          unitCommand.targetWorldSpacePos = memory.get("pylon.slot");
        } else if (data[1] === 880) {
          unitCommand.targetWorldSpacePos = memory.get("nexus.slot");
        } else if (data[1] === 883) {
          unitCommand.targetWorldSpacePos = memory.get("gateway.slot");
        } else {
          unitCommand.targetWorldSpacePos = { x: data[2], y: data[3] };
        }
      }

      memory.set("mode/" + unitTag, memory.get("mode"));

      this.actions.push({ actionRaw: { unitCommand: unitCommand } });
    } else if (command < 4) {
      // TODO: Fix this. The input should come from data
      // Command a unit with [<unit tag>, <ability id>]
      const unit = memory.get("ref/" + data[0]);
      const abilityId = data[1];
      const target = memory.get("ref/" + data[2]);

      this.actions.push({
        actionRaw: {
          unitCommand: {
            unitTags: [unit],
            abilityId: abilityId,
            targetUnitTag: target,
            queueCommand: false,
          }
        }
      });

      // TODO: Remove this when settling skill "harvest-minerals"
      memory.set("assignments/" + unit, target);
      let harvesters = memory.get("assignments/" + target);
      if (!harvesters) harvesters = [];
      harvesters.push(unit);
      memory.set("assignments/" + target, harvesters);
    } else if (command < 5) {
      // Command a unit with [<unit tag>, <ability id>, <unit tag>]
      const unit = memory.get("ref/" + data[0]);
      const abilityId = data[1];
      const target = memory.get("ref/" + data[2]);

      this.actions.push({
        actionRaw: {
          unitCommand: {
            unitTags: [unit],
            abilityId: abilityId,
            targetUnitTag: target,
            queueCommand: false,
          }
        }
      });
    } else if (command < 6) {
      // TODO: Each probe should be a body, so that the unit is immediately known
      const unitTag = memory.get("ref/" + data[0]);
      const unit = this.observer.getUnit(unitTag);

      if (!unit) return;

      if (isUnitBehindNexus(unit)) {
        this.actions.push({
          actionRaw: {
            unitCommand: {
              unitTags: [unit.tag],
              abilityId: 3674,
              targetWorldSpacePos: { x: memory.get("enemy.x"), y: memory.get("enemy.y") },
              queueCommand: false
            }
          }
        });
      } else {
        const probe = new Probe(unit.tag);

        probe.situate(this.observer.situation());
        probe.motor = await brain.react(probe.sensor);

        const action = probe.toCommand();
        const distance = unit.radius * 3;

        this.actions.push({
          actionRaw: {
            unitCommand: {
              unitTags: [unit.tag],
              abilityId: action.abilityId,
              targetWorldSpacePos: { x: unit.pos.x + action.x * distance, y: unit.pos.y + action.y * distance },
              queueCommand: false
            }
          }
        });
      }

      memory.set("time/" + unitTag, memory.get("time"));
      return "continue";
    }
  }

  async tock() {
    const units = [];
    for (const action of this.actions) {
      if (action.actionRaw && action.actionRaw.unitCommand && action.actionRaw.unitCommand.unitTags) {
        const actionUnit = action.actionRaw.unitCommand.unitTags[0];
        if (units.indexOf(actionUnit) >= 0) {
          action.actionRaw.unitCommand.queueCommand = true;
        } else {
          units.push(actionUnit);
        }
      }
    }

    await this.client.action({ actions: this.actions });

    this.actions = [];

    if (memory.get("game over")) this.dettach();
  }

  async dettach() {
    if (this.client) {
      await this.client.quit();
    }
  }

}

// TODO: Make a skill out of this
function isUnitBehindNexus(unit) {
  const nexusX = memory.get("mainbase.x");
  const nexusY = memory.get("mainbase.y");
  const nexusRadius = memory.get("mainbase.radius");
  const enemyX = memory.get("enemy.x");
  const enemyY = memory.get("enemy.y");

  let xaxis = false;
  if (unit.pos.x >= enemyX) {
    if ((nexusX - nexusRadius <= unit.pos.x) && (nexusX + nexusRadius >= enemyX)) xaxis = true;
  } else {
    if ((nexusX - nexusRadius <= enemyX) && (nexusX + nexusRadius >= unit.pos.x)) xaxis = true;
  }

  let yaxis;
  if (unit.pos.y >= enemyY) {
    if ((nexusY - nexusRadius <= unit.pos.y) && (nexusY + nexusRadius >= enemyY)) yaxis = true;
  } else {
    if ((nexusY - nexusRadius <= enemyY) && (nexusY + nexusRadius >= enemyY)) yaxis = true;
  }

  return xaxis && yaxis;
}
