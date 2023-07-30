
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

  async perform(client, time, worker) {
    if (worker.progress && (worker.progress.jobStatus === Status.Complete)) return Status.Complete;
    if (!worker.progress) worker.progress = { taskIndex: 0, taskStatus: Status.New, jobStatus: Status.New };

    const task = this.tasks[worker.progress.taskIndex];

    await task.perform(client, time, worker);

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

  constructor(label, commands, isComplete, isProgressing) {
    this.label = label;
    this.commands = commands;
    this.isProgressing = isProgressing;
    this.isComplete = isComplete;
  }

  async perform(client, time, worker) {
    if ((worker.progress.taskStatus === Status.Progressing) && this.isComplete(worker, time)) {
      return (worker.progress.taskStatus = Status.Complete);
    }

    if ((worker.progress.taskStatus === Status.New) || (this.isProgressing && !this.isProgressing(worker, time))) {
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
    (worker) => ((worker.order.abilityId === 298) && (worker.order.targetUnitTag === worker.target.tag)),
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
    (worker) => [
      { abilityId: 880, targetWorldSpacePos: worker.target.pos },
      { abilityId: 16, targetWorldSpacePos: worker.lastpos },
    ],
    (worker) => (worker.order.abilityId === 16),
  ),
);

function squareDistance(a, b) {
  return ((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}
