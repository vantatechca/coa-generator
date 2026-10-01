'use strict';
const fs = require('fs');
const path = require('path');

// JSON-file backed store. Lots (and the uploaded logos/product images) live under data/<mode>.
class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = path.join(dir, 'lots.json');
    this.images = path.join(dir, 'images');
    fs.mkdirSync(this.images, { recursive: true });
  }
  all() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return {}; } }
  get(lot) { return this.all()[lot] || null; }
  write(all) {
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(all, null, 2));
    fs.renameSync(tmp, this.file);
  }
  put(lot, row) { return this.putMany([{ lot, row }])[0]; }
  // Writes every imported row in a single pass so a CSV with thousands of rows stays fast.
  // Returns one boolean per entry: true when the lot already existed (i.e. it was updated).
  putMany(entries) {
    if (!entries.length) return [];
    const all = this.all();
    const now = new Date().toISOString();
    const existed = entries.map(({ lot, row }) => {
      const had = Boolean(all[lot]);
      all[lot] = { row, updated: now };
      return had;
    });
    this.write(all);
    return existed;
  }
}

module.exports = { Store };
