type Listener = () => void;

export interface SelectionLimits {
  /** The most slots one person may hold, or null for no limit. */
  maxPicks: number | null;
  /** Slots that cannot be added, such as ones already full. Removing one is always allowed. */
  blocked: ReadonlySet<string>;
}

const NO_LIMITS: SelectionLimits = { maxPicks: null, blocked: new Set() };

/** The slots a person has chosen. A Set keeps lookup and change O(1), even for long hourly events. */
export class SelectionStore {
  private slots = new Set<string>();
  private listeners = new Set<Listener>();
  private version = 0;
  private outsideVersion = 0;
  private snapshot: readonly string[] | null = null;
  private limits: SelectionLimits = NO_LIMITS;

  private onRefused: (() => void) | null = null;

  has(slotId: string): boolean {
    return this.slots.has(slotId);
  }

  get size(): number {
    return this.slots.size;
  }

  /** The same array until the selection changes, so React can compare it and cache what it renders. */
  getSnapshot = (): readonly string[] => (this.snapshot ??= [...this.slots]);

  /** Called whenever a slot was asked for and not given, so the screen can react. */
  setOnRefused(listener: (() => void) | null): void {
    this.onRefused = listener;
  }

  /** The event's rules for adding. They do not remove anything already chosen. */
  setLimits(limits: SelectionLimits): void {
    this.limits = limits;
  }

  private canAdd(slotId: string): boolean {
    if (this.limits.blocked.has(slotId)) return false;
    return this.limits.maxPicks === null || this.slots.size < this.limits.maxPicks;
  }

  /**
   * Receives what a gesture already drew on the UI thread. It leaves outsideVersion alone so the
   * calendar does not redraw from here, which could undo a tap made while this was on its way.
   * The exception is a slot the limits refuse: the gesture drew it, so the calendar has to redraw.
   */
  applyFromGesture(slotIds: string[], add: boolean): void {
    let changed = false;
    let refused = false;
    for (const slotId of slotIds) {
      if (this.slots.has(slotId) === add) continue;
      if (add) {
        if (!this.canAdd(slotId)) {
          refused = true;
          continue;
        }
        this.slots.add(slotId);
      } else {
        this.slots.delete(slotId);
      }
      changed = true;
    }
    if (refused) {
      this.outsideVersion++;
      this.onRefused?.();
    }
    if (changed || refused) this.notify();
  }

  /**
   * For changes that did not start on the grid, such as screen readers and buttons.
   * False when the limits refused to add the slot.
   */
  toggle(slotId: string): boolean {
    if (!this.slots.delete(slotId)) {
      if (!this.canAdd(slotId)) {
        this.onRefused?.();
        return false;
      }
      this.slots.add(slotId);
    }
    this.outsideVersion++;
    this.notify();
    return true;
  }

  /** Adds as many of these as the limits allow, in the order given. For the shortcut buttons. */
  addMany(slotIds: Iterable<string>): void {
    let changed = false;
    let refused = false;
    for (const slotId of slotIds) {
      if (this.slots.has(slotId)) continue;
      if (!this.canAdd(slotId)) {
        refused = true;
        continue;
      }
      this.slots.add(slotId);
      changed = true;
    }
    if (refused) this.onRefused?.();
    if (!changed) return;
    this.outsideVersion++;
    this.notify();
  }

  /**
   * Makes the calendar draw itself from the store again. For when what a gesture drew on the UI
   * thread was overwritten there, and the screen would otherwise keep showing something else.
   */
  redraw(): void {
    this.outsideVersion++;
    this.notify();
  }

  /** Sets the selection as given, limits or not: a saved answer is shown as it was saved. */
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
    this.snapshot = null;
    this.version++;
    for (const listener of this.listeners) listener();
  }
}
