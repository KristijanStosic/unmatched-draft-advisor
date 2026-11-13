const STORAGE_KEY = "unmatched-draft-assistant-hero-tiers-v1";
const UINT32_RANGE = 2 ** 32;

export function loadHeroTiers() {
  try {
    const tiers = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(tiers)) return [];
    return tiers.filter((tier) =>
      typeof tier?.id === "string" &&
      typeof tier.name === "string" &&
      [tier.members, tier.history].every((list) =>
        Array.isArray(list) && list.every((slug) => typeof slug === "string"),
      ),
    );
  } catch {
    return [];
  }
}

export function saveHeroTiers(tiers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tiers));
    return true;
  } catch {
    return false;
  }
}

export function remainingHeroes(tier, heroes) {
  const members = new Set(tier.members);
  const drawn = new Set(tier.history);
  return heroes.filter(({ slug }) => members.has(slug) && !drawn.has(slug));
}

export function drawHeroIndex(size, random = globalThis.crypto) {
  const limit = UINT32_RANGE - (UINT32_RANGE % size);
  const sample = new Uint32Array(1);
  // Discard the incomplete range so every index has exactly the same odds.
  do {
    random.getRandomValues(sample);
  } while (sample[0] >= limit);
  return sample[0] % size;
}

export function wheelRotation(size, winnerIndex) {
  return 6 * 360 - (winnerIndex + 0.5) * (360 / size);
}
