import { deepCopy, nowIso, stableId } from './utils.js';

export class AuditLog {
  #entries = [];
  #sequence = 0;
  constructor({ clock = Date.now, maxEntries = 1000, sink = null } = {}) {
    this.clock = clock;
    this.maxEntries = maxEntries;
    this.sink = sink;
  }
  append(type, payload = {}) {
    const entry = { id: stableId('AUD', this.clock, ++this.#sequence), type, at: nowIso(this.clock), payload: deepCopy(payload) };
    this.#entries.push(entry);
    while (this.#entries.length > this.maxEntries) this.#entries.shift();
    this.sink?.(deepCopy(entry));
    return deepCopy(entry);
  }
  list() { return deepCopy(this.#entries); }
  clear() { this.#entries = []; }
}
