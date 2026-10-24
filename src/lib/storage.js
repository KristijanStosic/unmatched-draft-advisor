const KEY = "unmatched-draft-assistant-roster";
export function loadRoster() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
export function saveRoster(roster) {
  try {
    localStorage.setItem(KEY, JSON.stringify(roster));
    return true;
  } catch {
    return false;
  }
}
export function clearRoster() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch {
    return false;
  }
}
