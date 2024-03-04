import Memory from "../../code/new-memory.js";

const missions = [];

export default class Mission extends Memory {

  constructor() {
    super();

    missions.push(this);
  }

  remove() {
    const index = missions.indexOf(this);

    if (index >= 0) {
      missions.splice(index, 1);
    }
  }

  static list() {
    return missions;
  }

}
