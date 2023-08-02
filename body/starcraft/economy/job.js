
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
    if (!worker.progress || !worker.progress.taskStatus) worker.progress = { taskIndex: 0, taskStatus: Status.New, jobStatus: Status.New };
    if (worker.progress.jobStatus === Status.Complete) return Status.Complete;
    if (worker.progress.jobStatus === Status.Failed) return Status.Failed;

    const task = this.tasks[worker.progress.taskIndex];
    const status = await task.perform(client, time, worker, depots, enemies);

    worker.progress.taskStatus = status;

    if (status === Status.Complete) {
      worker.progress.taskIndex++;
      worker.progress.taskStatus = Status.New;

      if (worker.progress.taskIndex >= this.tasks.length) {
        return (worker.progress.jobStatus = Status.Complete);
      }
    } else if (status === Status.Failed) {
      return (worker.progress.jobStatus = Status.Failed);
    }

    return (worker.progress.jobStatus = Status.Progressing);
  }

}

class Task {

  constructor(label, proceed) {
    this.label = label;
    this.proceed = proceed;
  }

  async perform(client, time, worker, depots, enemies) {
    const status = this.proceed(worker, worker.progress.taskStatus, time, depots, enemies);

    if (Array.isArray(status)) {
      const commands = status;
      const actions = [];

      for (let i = 0; i < commands.length; i++) {
        actions.push({ actionRaw: { unitCommand: { ...commands[i], unitTags: [worker.tag], queueCommand: (i > 0) } } });
      }

      const response = await client.action({ actions: actions });

      for (const result of response.result) {
        if (result !== 1) {
          console.log(worker.tag, JSON.stringify(commands), ">>", JSON.stringify(response));
          return (worker.progress.taskStatus = Status.Failed);
        }
      }

      return (worker.progress.taskStatus = Status.Progressing);
    } else if (Status[status]) {
      return status;
    }

    console.log("Unknown task status:", status);
    return Status.Failed;
  }

}

export const MiningJob = new Job(
  new Task("approach mine", (worker, status) => {
    if (!worker.target.content) {
      return Status.Failed;
    } else if ((status === Status.Progressing) && (squareDistance(worker.pos, worker.depot.pos) > worker.route.boostToMineSquareDistance)) {
      return Status.Complete;
    } else if ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag)) {
      return Status.Progressing;
    }
    return [{ abilityId: 298, targetUnitTag: worker.target.tag }];
  }),
  new Task("push to mine", (worker, status) => {
    if (worker.isObserved && !worker.target.content) {
      return Status.Failed;
    }

    worker.canBeMissingInObservation = (worker.target.source.type === "vespene");
    if ((status === Status.Progressing) && (!worker.isObserved || (worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag))) {
      return Status.Complete;
    } else if (worker.order.abilityId === 16) {
      return Status.Progressing;
    }
    return [
      { abilityId: 16, targetWorldSpacePos: worker.route.harvestPoint },
      { abilityId: 298, targetUnitTag: worker.target.tag },
    ];
  }),
  new Task("drill", (worker, status, time) => {
    if (worker.isObserved && !worker.target.content) {
      worker.canBeMissingInObservation = false;
      return Status.Failed;
    } else if ((status === Status.Progressing) && (worker.order.abilityId === 299)) {
      worker.target.checkOut(time, worker);
      return Status.Complete;
    } else if (!worker.isObserved || ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag))) {
      return Status.Progressing;
    }
    return [{ abilityId: 298, targetUnitTag: worker.target.tag }];
  }),
  new Task("pack", (worker) => {
    worker.canBeMissingInObservation = false;
    return worker.order.targetUnitTag ? Status.Complete : Status.Progressing;
  }),
  new Task("approach depot", (worker, status) => {
    if ((status === Status.Progressing) && (squareDistance(worker.pos, worker.depot.pos) < worker.route.boostToDepotSquareDistance)) {
      return Status.Complete;
    } else if (worker.order.abilityId === 299) {
      return Status.Progressing;
    }
    return [{ abilityId: 299, targetUnitTag: worker.depot.tag }];
  }),
  new Task("push to depot", (worker, status) => {
    if (status === Status.New) {
      return [
        { abilityId: 16, targetWorldSpacePos: worker.route.storePoint },
        { abilityId: 1, targetUnitTag: worker.depot.tag },
        { abilityId: 1, targetUnitTag: worker.target.tag },
      ];
    } else if ((status === Status.Progressing) && (worker.order.abilityId === 298)) {
      return Status.Complete;
    }
    return Status.Progressing;
  }),
);

export const ExpansionJob = new Job(
  new Task("build depot", (worker, _1, _2, depots, enemies) => {
    if (typeof(worker.target.isBuilding) === "string") {
      return Status.Complete;
    }

    if (enemies) {
      for (const [_, enemy] of enemies) {
        if (isNear(enemy.pos, worker.pos) || isNear(enemy.pos, worker.target.pos)) {
          worker.target.cancelBuild();
          return Status.Complete;
        }
      }
    }

    if (worker.order.abilityId !== 880) {
      return [{ abilityId: 880, targetWorldSpacePos: worker.target.pos }];
    }

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
          return [{ abilityId: 16, targetWorldSpacePos: worker.target.pos }];
        }
      }
    }

    return Status.Progressing;
  })
);

export const AssimilatorJob = new Job(
  new Task("build assimilator", (worker) => {
    if (worker.target.isBuilding) {
      return Status.Complete;
    } else if (worker.order.abilityId === 882) {
      return Status.Progressing;
    }
    return [{ abilityId: 882, targetUnitTag: worker.target.tag }];
  })
);

export const AttackJob = new Job(
  new Task("attack", (worker) => {
    if (!worker.target.isThreat()) {
      return Status.Complete;
    } else if (worker.canAttack) {
      if (worker.order.abilityId === 23) {
        return Status.Progressing;
      }
      return [{ abilityId: 1, targetUnitTag: worker.target.tag }];
    } else {
      if (worker.order.abilityId === 298) {
        return Status.Progressing;
      }
      return [{ abilityId: 1, targetUnitTag: worker.depot.getRallyMine().tag }];
    }
  })
);

function squareDistance(a, b) {
  return ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

function isNear(a, b) {
  return (Math.abs(a.x - b.x) < 10) && (Math.abs(a.y - b.y) < 10);
}
