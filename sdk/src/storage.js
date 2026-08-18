import { deepCopy } from './utils.js';

export class MemoryStorageAdapter {
  #data = new Map();
  async get(key) { return deepCopy(this.#data.get(key) ?? null); }
  async set(key, value) { this.#data.set(key, deepCopy(value)); }
  async delete(key) { this.#data.delete(key); }
}

export class LocalStorageAdapter {
  constructor(storage = globalThis.localStorage) {
    if (!storage) throw new Error('localStorage is unavailable');
    this.storage = storage;
  }
  async get(key) { const value = this.storage.getItem(key); return value == null ? null : JSON.parse(value); }
  async set(key, value) { this.storage.setItem(key, JSON.stringify(value)); }
  async delete(key) { this.storage.removeItem(key); }
}
