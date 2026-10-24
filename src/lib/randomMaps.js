export function validateMapSettings(tableCount, mapsPerTable, availableCount) {
  if (!Number.isSafeInteger(tableCount) || tableCount < 1 || tableCount > 100)
    return "Number of tables must be a whole number from 1 to 100.";
  if (!Number.isSafeInteger(mapsPerTable) || mapsPerTable < 1)
    return "Maps per table must be a positive whole number.";
  if (mapsPerTable > availableCount)
    return `Only ${availableCount} maps are available. Choose at most ${availableCount} maps per table.`;
  return "";
}

export function sampleMaps(maps, count, random = Math.random) {
  if (!Number.isSafeInteger(count) || count < 1 || count > maps.length)
    throw new RangeError("Invalid number of maps.");
  const shuffled = [...maps];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export function generateTables(maps, tableCount, mapsPerTable) {
  const error = validateMapSettings(tableCount, mapsPerTable, maps.length);
  if (error) throw new RangeError(error);
  return Array.from({ length: tableCount }, () =>
    sampleMaps(maps, mapsPerTable),
  );
}
