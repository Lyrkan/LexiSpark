/**
 * Get a deterministic daily number from a seed string
 * @param seed The seed string to use for generating the number
 * @returns A deterministic number based on the current date, hostname, and seed
 */
export function getDailyNumber(seed: string): number {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${seed}`;
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash << 5) - hash + dateString.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
