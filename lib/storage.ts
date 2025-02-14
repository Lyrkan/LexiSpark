interface StoredGameState {
  guessedWords: (string | null)[];
  startTime: number;
  endTime: number | null;
  bloomFilterHash: string;
  lastUpdated: number;
  expiresAt?: string;
}

interface StoredGameProgress {
  completedWords: number;
  totalWords: number;
  lastUpdated: number;
  expiresAt?: string;
}

const STORAGE_PREFIX = "lexispark";
const GAME_STATE_PREFIX = `${STORAGE_PREFIX}_game_state`;
const GAME_PROGRESS_PREFIX = `${STORAGE_PREFIX}_game_progress`;

// Helper to compute a simple hash of the bloom filter
function computeBloomFilterHash(bloomFilter: Uint8Array): string {
  return Array.from(bloomFilter)
    .reduce((hash, byte, i) => hash + byte * (i + 1), 0)
    .toString(36);
}

// Helper to check if a state is still valid based on its expiration
function isStateValid(state: { expiresAt?: string }): boolean {
  if (!state.expiresAt) return true;
  return new Date(state.expiresAt).getTime() > Date.now();
}

export function saveGameState(
  id: string,
  state: {
    guessedWords: (string | null)[];
    startTime: number;
    endTime: number | null;
    bloomFilter: Uint8Array;
    expiresAt?: string;
  },
): void {
  const storedState: StoredGameState = {
    guessedWords: state.guessedWords,
    startTime: state.startTime,
    endTime: state.endTime,
    bloomFilterHash: computeBloomFilterHash(state.bloomFilter),
    lastUpdated: Date.now(),
    expiresAt: state.expiresAt,
  };

  try {
    localStorage.setItem(
      `${GAME_STATE_PREFIX}_${id}`,
      JSON.stringify(storedState),
    );

    // Also update progress
    const progress: StoredGameProgress = {
      completedWords: state.guessedWords.filter((w) => w !== null).length,
      totalWords: state.guessedWords.length,
      lastUpdated: Date.now(),
      expiresAt: state.expiresAt,
    };

    localStorage.setItem(
      `${GAME_PROGRESS_PREFIX}_${id}`,
      JSON.stringify(progress),
    );
  } catch (error) {
    console.error("Failed to save game state:", error);
  }
}

export function loadGameState(
  id: string,
  bloomFilter: Uint8Array,
): StoredGameState | null {
  try {
    const storedStateJson = localStorage.getItem(`${GAME_STATE_PREFIX}_${id}`);
    if (!storedStateJson) return null;

    const storedState: StoredGameState = JSON.parse(storedStateJson);

    // Check if the state is still valid
    if (!isStateValid(storedState)) {
      localStorage.removeItem(`${GAME_STATE_PREFIX}_${id}`);
      return null;
    }

    // Verify bloom filter hash
    const currentHash = computeBloomFilterHash(bloomFilter);
    if (currentHash !== storedState.bloomFilterHash) {
      return null;
    }

    return storedState;
  } catch (error) {
    console.error("Failed to load game state:", error);
    return null;
  }
}

export function getGameProgress(id: string): StoredGameProgress | null {
  try {
    const storedProgressJson = localStorage.getItem(
      `${GAME_PROGRESS_PREFIX}_${id}`,
    );
    if (!storedProgressJson) return null;

    const storedProgress: StoredGameProgress = JSON.parse(storedProgressJson);

    // Check if the progress is still valid
    if (!isStateValid(storedProgress)) {
      localStorage.removeItem(`${GAME_PROGRESS_PREFIX}_${id}`);
      return null;
    }

    return storedProgress;
  } catch (error) {
    console.error("Failed to load game progress:", error);
    return null;
  }
}

export function clearGameState(id: string): void {
  try {
    localStorage.removeItem(`${GAME_STATE_PREFIX}_${id}`);
    localStorage.removeItem(`${GAME_PROGRESS_PREFIX}_${id}`);
  } catch (error) {
    console.error("Failed to clear game state:", error);
  }
}
