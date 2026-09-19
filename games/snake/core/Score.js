export class Score {
  constructor() { this.reset(); }
  reset() { this.value = 0; }
  add(amount) { this.value += amount; return this.value; }
}
