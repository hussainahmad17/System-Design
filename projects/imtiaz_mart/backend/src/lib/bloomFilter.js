import { createHash } from "node:crypto";

/**
 * Bloom filter: answers "have I seen this value?" with
 *   false -> definitely not seen (never wrong)
 *   true  -> probably seen (may be a false positive, so confirm with the DB)
 *
 * Memory: m bits, not the values. 1M emails at 1% false positives = ~1.2 MB.
 * Add and check are O(k), where k = number of hash positions (7 at 1%).
 */
export class BloomFilter {
  /**
   * @param {number} expectedItems  n: how many values we plan to store
   * @param {number} falsePositiveRate  p: e.g. 0.01 = 1%
   */
  constructor(expectedItems, falsePositiveRate) {
    // Standard formulas for the best size and hash count:
    //   m = -n * ln(p) / (ln 2)^2      k = (m / n) * ln 2
    const m = Math.ceil((-expectedItems * Math.log(falsePositiveRate)) / Math.LN2 ** 2);
    this.size = m;
    this.hashCount = Math.max(1, Math.round((m / expectedItems) * Math.LN2));
    this.bits = new Uint8Array(Math.ceil(m / 8)); // 8 bits per byte
    this.count = 0;
  }

  /**
   * Double hashing (Kirsch–Mitzenmacher): compute 2 hashes once, then derive k positions
   * as h1 + i*h2. Same accuracy as k independent hash functions, at the cost of one hash.
   */
  #positions(value) {
    const digest = createHash("sha256").update(value).digest();
    const h1 = digest.readUInt32BE(0);
    // | 1 makes it odd, so the steps never collapse to one position.
    // >>> 0 turns it back into an unsigned int: | alone yields a signed (possibly negative) number,
    // which gives negative positions outside the bit array and silent false negatives.
    const h2 = (digest.readUInt32BE(4) | 1) >>> 0;
    const out = new Array(this.hashCount);
    for (let i = 0; i < this.hashCount; i++) {
      out[i] = (h1 + i * h2) % this.size;
    }
    return out;
  }

  add(value) {
    for (const pos of this.#positions(value)) {
      this.bits[pos >>> 3] |= 1 << (pos & 7); // byte = pos / 8, bit = pos % 8
    }
    this.count++;
  }

  mightContain(value) {
    for (const pos of this.#positions(value)) {
      if ((this.bits[pos >>> 3] & (1 << (pos & 7))) === 0) return false; // one empty bit = definitely absent
    }
    return true;
  }

  stats() {
    return {
      items: this.count,
      bits: this.size,
      hashes: this.hashCount,
      memoryKB: Math.round(this.bits.byteLength / 1024),
    };
  }
}
