import { BloomFilter } from "bloomfilter";
import { normalizeText } from "./textUtils";

export interface SerializedBloomFilter {
  m: number;
  k: number;
  buckets: Int32Array;
}

export function createBloomFilter(
  words: string[],
  falsePositiveRate: number = 0.01,
): Uint8Array {
  // Calculate optimal size (m) and number of hash functions (k)
  // Using formulas from: https://en.wikipedia.org/wiki/Bloom_filter#Optimal_number_of_hash_functions
  const n = words.length;
  const m = Math.ceil(-(n * Math.log(falsePositiveRate)) / Math.log(2) ** 2);
  const k = Math.round((m / n) * Math.log(2));

  // Create the filter with calculated parameters
  const filter = new BloomFilter(m, k);

  // Add all words to the filter (normalized)
  for (const word of words) {
    filter.add(normalizeText(word));
  }

  // Convert the filter to a Uint8Array for storage
  // First 8 bytes: m (4 bytes) and k (4 bytes)
  // Rest: bloom filter buckets
  const array = new Uint8Array(8 + filter.buckets.length * 4);
  const view = new DataView(array.buffer);

  // Store m and k
  view.setInt32(0, m, true);
  view.setInt32(4, k, true);

  // Store buckets
  filter.buckets.forEach((value: number, i: number) => {
    view.setInt32(8 + i * 4, value, true);
  });

  return array;
}

export function deserializeBloomFilter(
  data: Uint8Array,
): SerializedBloomFilter {
  const view = new DataView(data.buffer);

  // Read m and k parameters
  const m = view.getInt32(0, true);
  const k = view.getInt32(4, true);

  // Read buckets (skipping first 8 bytes which contain m and k)
  const buckets = new Int32Array((data.length - 8) / 4);
  for (let i = 0; i < buckets.length; i++) {
    buckets[i] = view.getInt32(8 + i * 4, true);
  }

  return { m, k, buckets };
}

export function checkWord(bloomFilter: Uint8Array, word: string): boolean {
  const { m, k, buckets } = deserializeBloomFilter(bloomFilter);
  const filter = new BloomFilter(m, k);
  filter.buckets = buckets;

  return filter.test(normalizeText(word));
}
