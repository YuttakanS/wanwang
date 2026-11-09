type Listener = () => void;

/** The slots a person has chosen. A Set keeps lookup and change O(1), even for long hourly events. */
export class SelectionStore {
  private slots = new Set<string>();
  private listeners = new Set<Listener>();
  private version = 0;
  private outsideVersion = 0;

  has(slotId: string): boolean {
    return this.slots.has(slotId);
  }

  get size(): number {
    return this.slots.size;
  }

  toArray(): string[] {
    return [...this.slots];
  }

  /**
   * Receives what a gesture already drew on the UI thread. It leaves outsideVersion alone so the
   * calendar does not redraw from here, which could undo a tap made while this was on its way.
   */
  applyFromGesture(slotIds: string[], add: boolean): void {
    let changed = false;
    for (const slotId of slotIds) {
      if (this.slots.has(slotId) === add) continue;
      if (add) this.slots.add(slotId);
      else this.slots.delete(slotId);
      changed = true;
    }
    if (changed) this.notify();
  }

  /** For changes that did not start on the grid, such as screen readers, buttons and loaded votes. */
  toggle(slotId: string): void {
    if (!this.slots.delete(slotId)) this.slots.add(slotId);
    this.outsideVersion++;
    this.notify();
  }

  replace(slotIds: Iterable<string>): void {
    this.slots = new Set(slotIds);
    this.outsideVersion++;
    this.notify();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getVersion = (): number => this.version;

  getOutsideVersion = (): number => this.outsideVersion;

  private notify(): void {
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
