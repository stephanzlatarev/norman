
export const Status = {
  New: "New",
  Progressing: "Progressing",
  Complete: "Complete",
  Failed: "Failed",
};

class Job {

  constructor(...tasks) {
    this.tasks = tasks;
  }

  async perform(client, time, worker, depots, enemies) {
    if (worker.progress && (worker.progress.jobStatus === Status.Complete)) return Status.Complete;
    if (!worker.progress || !worker.progress.taskStatus) worker.progress = { taskIndex: 0, taskStatus: Status.New, jobStatus: Status.New };

    const task = this.tasks[worker.progress.taskIndex];

    await task.perform(client, time, worker, depots, enemies);

    if (worker.progress.taskStatus === Status.Complete) {
      worker.progress.taskIndex++;
      worker.progress.taskStatus = Status.New;

      if (worker.progress.taskIndex >= this.tasks.length) {
        return (worker.progress.jobStatus = Status.Complete);
      }
    } else if (worker.progress.taskStatus === Status.Failed) {
      return (worker.progress.jobStatus = Status.Failed);
    }

    return (worker.progress.jobStatus = Status.Progressing);
  }

}

class Task {

  constructor(label, commands, isComplete, isProgressing, isCancelled) {
    this.label = label;
    this.commands = commands;
    this.isProgressing = isProgressing;
    this.isComplete = isComplete;
    this.isCancelled = isCancelled;
  }

  async perform(client, time, worker, depots, enemies) {
    if ((worker.progress.taskStatus === Status.Progressing) && this.isComplete(worker, time)) {
      return (worker.progress.taskStatus = Status.Complete);
    }
    if (this.isCancelled && this.isCancelled(worker, enemies)) {
      return (worker.progress.taskStatus = Status.Complete);
    }

    if ((worker.progress.taskStatus === Status.New) || (this.isProgressing && !this.isProgressing(worker, time, depots))) {
      const commands = this.commands(worker);

      if (commands.length) {
        const actions = [];

        for (let i = 0; i < commands.length; i++) {
          actions.push({ actionRaw: { unitCommand: { ...commands[i], unitTags: [worker.tag], queueCommand: (i > 0) } } });
        }

        const response = await client.action({ actions: actions });

        worker.trace(show(commands), ">>", JSON.stringify(response));

        for (const result of response.result) {
          if (result !== 1) {
            return (worker.progress.taskStatus = Status.Failed);
          }
        }
      }
    }

    return (worker.progress.taskStatus = Status.Progressing);
  }

}

export const MiningJob = new Job(
  new Task("approach mine",
    (worker) => [{ abilityId: 298, targetUnitTag: worker.target.tag }],
    (worker) => (squareDistance(worker.pos, worker.depot.pos) > worker.target.route.boost * worker.target.route.boost),
    (worker) => (((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag) || (worker.order.abilityId === 299))),
  ),
  new Task("push to mine",
    (worker) => [
      { abilityId: 16, targetWorldSpacePos: worker.target.route.harvestPoint },
      { abilityId: 298, targetUnitTag: worker.target.tag },
    ],
    (worker) => ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag)),
  ),
  new Task("drill",
    (worker) => [{ abilityId: 298, targetUnitTag: worker.target.tag }],
    (worker, time) => {
      if (worker.order.abilityId === 299) {
        worker.target.checkOut(time, worker);
        return true;
      }
      return false;
    },
    (worker) => ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag)),
  ),
  new Task("pack",
    () => [],
    (worker) => ((worker.order.abilityId === 299) && worker.order.targetUnitTag),
  ),
  new Task("approach depot",
    (worker) => [{ abilityId: 1, targetUnitTag: worker.depot.tag }],
    (worker) => (squareDistance(worker.pos, worker.depot.pos) < worker.target.route.boost * worker.target.route.boost),
  ),
  new Task("push to depot",
    (worker) => [
      { abilityId: 1, targetWorldSpacePos: worker.target.route.storePoint },
      { abilityId: 1, targetUnitTag: worker.depot.tag },
      { abilityId: 1, targetUnitTag: worker.target.tag },
    ],
    (worker) => (worker.order.abilityId === 298),
  ),
);

export const ExpansionJob = new Job(
  new Task("build depot",
    (worker) => [{ abilityId: (worker.order.abilityId !== 880) ? 880 : 16, targetWorldSpacePos: worker.target.pos }],
    (worker) => (typeof(worker.target.isBuilding) === "string"),

    function(worker, _, depots) {
      if (worker.order.abilityId !== 880) return false;

      if (worker.progress.recheck) {
        worker.progress.recheck--;
      } else {
        worker.progress.recheck = 50;

        const target = worker.target;
        const distanceToTarget = squareDistance(worker.pos, target.pos);

        for (const depot of depots) {
          if (!depot.isActive && !depot.isBuilding && !depot.cooldown && (squareDistance(worker.pos, depot.pos) < distanceToTarget)) {
            const progress = { ...worker.progress };
            target.cancelBuild();
            depot.build(worker);
            worker.progress = progress;
            return false;
          }
        }
      }

      return true;
    },

    function(worker, enemies) {
      if (!enemies) return false;

      for (const [_, enemy] of enemies) {
        if (isNear(enemy.pos, worker.pos) || isNear(enemy.pos, worker.target.pos)) {
          worker.target.cancelBuild();
          return true;
        }
      }

      return false;
    },
  ),
);

export const AssimilatorJob = new Job(
  new Task("build assimilator",
    (worker) => [{ abilityId: 882, targetUnitTag: worker.target.tag }],
    (worker) => !!worker.target.isBuilding,
  )
);

export const AttackJob = new Job(
  new Task("attack",
    (worker) => [{ abilityId: 1, targetUnitTag: (worker.canAttack ? worker.target.tag : worker.depot.getRallyMine().tag) }],
    (worker) => !worker.target.isThreat(),
    (worker) => (worker.canAttack ? (worker.order.abilityId === 23) : (worker.order.abilityId === 298)),
  )
);

function squareDistance(a, b) {
  return ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function isNear(a, b) {
  return (Math.abs(a.x - b.x) < 10) && (Math.abs(a.y - b.y) < 10);
}



/// TODO: Remove with tracing
function show(commands) {
  const list = [];
  for (const command of commands) {
    let target = "";
    if (command.targetUnitTag) target = command.targetUnitTag;
    if (command.targetWorldSpacePos) target = command.targetWorldSpacePos.x.toFixed(2) + ":" + command.targetWorldSpacePos.y.toFixed(2);
    list.push(command.abilityId + " -> " + target);
  }
  return list.join(" >> ");
}
