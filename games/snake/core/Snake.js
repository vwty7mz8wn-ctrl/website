export class Snake {
  constructor(segments, direction) {
    this.reset(segments, direction);
  }

  reset(segments, direction) {
    this.segments = segments.map(segment => ({ ...segment }));
    this.direction = { ...direction };
    this.pendingDirection = { ...direction };
  }

  get head() { return this.segments[0]; }
  get length() { return this.segments.length; }

  queueDirection(next) {
    if (!next || (next.x === -this.pendingDirection.x && next.y === -this.pendingDirection.y)) return false;
    this.pendingDirection = { ...next };
    return true;
  }

  nextHead() {
    return { x: this.head.x + this.pendingDirection.x, y: this.head.y + this.pendingDirection.y };
  }

  move(head, grows = false) {
    this.direction = { ...this.pendingDirection };
    this.segments.unshift({ ...head });
    if (!grows) this.segments.pop();
  }

  collidesWithBody(position, includeTail) {
    const body = includeTail ? this.segments : this.segments.slice(0, -1);
    return body.some(segment => segment.x === position.x && segment.y === position.y);
  }

  shrink(amount, minLength) {
    const removable = Math.max(0, this.length - minLength);
    const actual = Math.min(amount, removable);
    if (actual) this.segments.splice(this.length - actual, actual);
    return actual;
  }

  occupies(position) {
    return this.segments.some(segment => segment.x === position.x && segment.y === position.y);
  }
}
