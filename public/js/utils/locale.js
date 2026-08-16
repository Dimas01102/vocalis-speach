const FLAG_CACHE = new Map();

export function getFlagEmoji(regionCode) {
  if (
    !regionCode ||
    regionCode.length !== 2 ||
    !/^[a-zA-Z]{2}$/.test(regionCode)
  ) {
    return "🌐";
  }
  const key = regionCode.toUpperCase();
  if (FLAG_CACHE.has(key)) return FLAG_CACHE.get(key);

  const codePoints = [...key].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  const flag = String.fromCodePoint(...codePoints);
  FLAG_CACHE.set(key, flag);
  return flag;
}

let langDisplay = null;
let regionDisplay = null;
try {
  if (typeof Intl !== "undefined" && Intl.DisplayNames) {
    langDisplay = new Intl.DisplayNames(["en"], { type: "language" });
    regionDisplay = new Intl.DisplayNames(["en"], { type: "region" });
  }
} catch (e) {}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function parseLocale(rawTag) {
  const tag = (rawTag || "").replace(/_/g, "-");
  const parts = tag.split("-").filter(Boolean);
  const langCode = (parts[0] || "").toLowerCase();
  const regionCode = parts.slice(1).find((p) => /^[a-zA-Z]{2}$/.test(p));
  return {
    tag,
    langCode,
    regionCode: regionCode ? regionCode.toUpperCase() : null,
  };
}

export function formatLanguageLabel(rawTag) {
  const { tag, langCode, regionCode } = parseLocale(rawTag);
  if (!langCode) return tag || "Unknown";

  let langName = tag;
  try {
    const resolved = langDisplay?.of(langCode);
    if (resolved) langName = capitalize(resolved);
  } catch (e) {}

  let regionName = null;
  try {
    regionName = regionCode ? regionDisplay?.of(regionCode) : null;
  } catch (e) {
    regionName = null;
  }

  const flag = regionCode ? getFlagEmoji(regionCode) : "🌐";
  return regionName
    ? `${flag} ${langName} (${regionName})`
    : `${flag} ${langName}`;
}

export function formatFlagOnly(rawTag) {
  const { regionCode } = parseLocale(rawTag);
  return regionCode ? getFlagEmoji(regionCode) : "🌐";
}
