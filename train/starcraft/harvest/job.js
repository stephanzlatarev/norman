
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
    (worker) => [{ abilityId: 1, targetUnitTag: worker.target.tag }],
    (worker) => (squareDistance(worker.pos, worker.target.route.harvestPoint) < worker.target.route.boost * worker.target.route.boost),
    (worker) => (((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag) || (worker.order.abilityId === 299))),
  ),
  new Task("push to mine",
    (worker) => [
      { abilityId: 1, targetWorldSpacePos: worker.target.route.harvestPoint },
      { abilityId: 1, targetUnitTag: worker.target.tag },
    ],
    (worker) => ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag)),
  ),
  new Task("drill",
    () => [],
    (worker) => (worker.order.abilityId === 299),
    (worker) => ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag)),
  ),
  new Task("pack",
    () => [],
    (worker, time) => {
      if ((worker.order.abilityId === 299) && worker.order.targetUnitTag) {
        worker.target.checkOut(time, worker);
        return true;
      }
      return false;
    }
  ),
  new Task("approach depot",
    (worker) => [{ abilityId: 1, targetUnitTag: worker.depot.tag }],
    (worker) => (squareDistance(worker.pos, worker.target.route.storePoint) < worker.target.route.boost * worker.target.route.boost),
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

export const AttackJob = new Job(
  new Task("attack",
    (worker) => [{ abilityId: 1, targetUnitTag: (worker.canAttack ? worker.target.tag : worker.depot.getRallyMine().tag) }],
    (worker) => !worker.target.isActive,
    (worker) => (worker.canAttack ? (worker.order.abilityId === 23) : (worker.order.abilityId === 298)),
  )
);

function squareDistance(a, b) {
  return ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function isNear(a, b) {
  return (Math.abs(a.x - b.x) < 10) && (Math.abs(a.y - b.y) < 10);
}
