
export default class RandomPlayer {

  constructor(name) {
    this.name = name;
  }

  play(boards) {
    const deployments = [];

    for (const board of boards) {
      deployments.push(random(board));
    }

    return deployments;
  }

}

function random(board) {
  const deployment = [];
  let army = 0;

  for (let i = 0; i < board.length; i++) {
    if (board[i] >= 0.1) {
      army += board[i];
    }

    deployment.push(0);
  }

  for (let i = 0; i < army; i++) {
    const spot = Math.floor(board.length * Math.random());
    deployment[spot]++;
  }

  return deployment;
}
