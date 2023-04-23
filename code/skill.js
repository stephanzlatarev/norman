
export default class Skill {

  constructor(label, memory, brain, given, when, then) {
    this.label = label;
    this.memory = memory;
    this.brain = brain;

    this.situations = {};
    this.given = memory.pattern(given).title(label + " - given");
    this.when = when;
    this.then = then;

    this.given.listen(this.onChange.bind(this));
  }

  onChange() {
    const exists = {};

    for (const situation of this.given) {
      const key = situation.key();

      exists[key] = true;

      if (!this.situations[key]) {
        this.situations[key] = new Situation(this, situation);
      }
    }

    for (const key in this.situations) {
      if (!exists[key]) {
        this.situations[key].stop();
        delete this.situations[key];
      }
    }
  }

}

class Situation {

  constructor(skill, given) {
    this.skill = skill;
    this.when = skill.memory.pattern(skill.when).title(skill.label + " - when").fix(given);
    this.then = skill.memory.pattern(skill.then).title(skill.label + " - then");

    this.when.listen(this.onChange.bind(this));
  }

  async onChange() {
    const infoSize = length(this.then.infos);

    let updates = [];
    let feedback = [];
    let fixture;

    for (const take of this.when) {
      this.then.fix(take);

      const input = take.data();
      const reaction = await this.skill.brain.react(...input, ...feedback);

      if (reaction) {
        fixture = take;
        updates = reaction.slice(0, infoSize);
        feedback = reaction.slice(infoSize);
      }
    }

    if (fixture) {
      this.then.fix(fixture);
      this.then.write(updates);
    }
  }

  stop() {
    this.when.remove(this.when);
    this.then.remove(this.then);
  }
}

function length(object) {
  let index = 0;
  for (const _ in object) index++;
  return index;
}
