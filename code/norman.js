import Body from "./body.js";
import Goal from "./goal.js";
import Memory from "./memory/memory.js";

export default class Norman {

  constructor(env) {
    this.memory = new Memory(env);
    this.goal = new Goal(this.memory.get("goal"));
    this.body = new Body(this.memory.get("body"));
  }

  async go() {
    console.log("Hi!");

    while (this.goal.ok() && this.body.ok()) {

      // Bodies should now read the changes in their situation
      await this.body.tick();

      // Run all skills towards the goals
      await this.goal.tick();

      // Bodies should now execute the performed actions
      await this.body.tock();

      // Give space for asynchronous operations
      await new Promise(r => setTimeout(r));
    }

    console.log("Bye!");
  }
  
  stop() {
    if (this.body.ok()) {
      this.body.detach();
    }
  }

}
