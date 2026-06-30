type ModerationText = Readonly<{
  compact: string;
  normalized: string;
  spaced: string;
}>;

const MODERATION_CHARACTER_REPLACEMENTS = new Map([
  ["@", "a"],
  ["4", "a"],
  ["8", "b"],
  ["3", "e"],
  ["6", "g"],
  ["9", "g"],
  ["1", "i"],
  ["!", "i"],
  ["+", "t"],
  ["0", "o"],
  ["2", "z"],
  ["$", "s"],
  ["5", "s"],
  ["7", "t"],
  ["α", "a"],
  ["а", "a"],
  ["β", "b"],
  ["с", "c"],
  ["ϲ", "c"],
  ["ε", "e"],
  ["е", "e"],
  ["ι", "i"],
  ["і", "i"],
  ["ο", "o"],
  ["р", "p"],
  ["ρ", "p"],
  ["ѕ", "s"],
  ["τ", "t"],
  ["υ", "u"],
  ["х", "x"],
  ["χ", "x"],
]);

const BLOCKED_TOKEN_TERMS = [
  "abruti",
  "andouille",
  "arse",
  "ass",
  "con",
  "conne",
  "connes",
  "cons",
  "crap",
  "fdp",
  "kys",
  "ntm",
  "pd",
  "tg",
  "wtf",
] as const;

const BLOCKED_SHORT_FLEXIBLE_TERMS = BLOCKED_TOKEN_TERMS.filter((term) => term.length <= 3);

const BLOCKED_SPACED_PHRASES = [
  "drop dead",
  "end yourself",
  "fils de pute",
  "fuck off",
  "fuck you",
  "go die",
  "go fuck yourself",
  "go kill urself",
  "go kill yourself",
  "hurt urself",
  "hurt yourself",
  "kill urself",
  "kill yourself",
  "nique ta mere",
  "piss off",
  "sale pute",
  "shut the fuck up",
  "shut up",
  "son of a bitch",
  "suck my dick",
  "suicide toi",
  "ta gueule",
  "ta race",
  "va crever",
  "va te faire foutre",
  "vas te faire foutre",
] as const;

const BLOCKED_FLEXIBLE_TERMS = [
  "asshole",
  "arsehole",
  "bastard",
  "batard",
  "batarde",
  "bitch",
  "bitches",
  "btch",
  "bollocks",
  "bullshit",
  "chiasse",
  "chier",
  "clochard",
  "connard",
  "connards",
  "connasse",
  "connasses",
  "couillon",
  "couillonne",
  "cunt",
  "debile",
  "debiles",
  "dick",
  "dickhead",
  "dipshit",
  "douchebag",
  "dumbass",
  "dumbfuck",
  "emmerde",
  "emmerder",
  "encule",
  "enculee",
  "enculer",
  "encules",
  "fag",
  "faggot",
  "fck",
  "fuck",
  "fucker",
  "gouine",
  "gouines",
  "idiot",
  "idiote",
  "idiots",
  "imbecile",
  "imbeciles",
  "jackass",
  "merde",
  "motherfucker",
  "moron",
  "morons",
  "nazi",
  "nazis",
  "nigga",
  "niggah",
  "nigger",
  "negre",
  "negres",
  "negresse",
  "nigrou",
  "nique",
  "niquer",
  "pedale",
  "pedales",
  "pede",
  "pedes",
  "pedo",
  "pedophile",
  "prick",
  "putain",
  "pute",
  "putes",
  "retard",
  "retarded",
  "salaud",
  "salopard",
  "salope",
  "salopes",
  "shit",
  "sht",
  "shithead",
  "slut",
  "sluts",
  "scumbag",
  "stupid",
  "tapette",
  "tapettes",
  "tarba",
  "terrorist",
  "terrorists",
  "terroriste",
  "terroristes",
  "tocard",
  "tocarde",
  "trouduc",
  "twat",
  "wanker",
  "whore",
] as const;

const BLOCKED_COMPACT_TERMS = [
  "asshole",
  "connard",
  "connasse",
  "endyourself",
  "filsdepute",
  "fuckoff",
  "fuckyou",
  "gofuckyourself",
  "gokillurself",
  "gokillyourself",
  "hurturself",
  "hurtyourself",
  "killurself",
  "killyourself",
  "motherfucker",
  "niquetamere",
  "salepedale",
  "salepute",
  "shutthefuckup",
  "sonofabitch",
  "suckmydick",
  "suicidetoi",
  "tagueule",
  "tarace",
  "vacrever",
  "vatefairefoutre",
  "vastefairefoutre",
] as const;

const BLOCKED_COMPACT_EXACT_TERMS = ["dropdead", "godie"] as const;

const BLOCKED_TOKEN_PATTERNS = BLOCKED_TOKEN_TERMS.map((term) => createTokenPattern(term));
const BLOCKED_SHORT_FLEXIBLE_PATTERNS = BLOCKED_SHORT_FLEXIBLE_TERMS.map((term) => createFlexibleTermPattern(term));
const BLOCKED_SPACED_PATTERNS = BLOCKED_SPACED_PHRASES.map((phrase) => createSpacedPhrasePattern(phrase));
const BLOCKED_FLEXIBLE_PATTERNS = BLOCKED_FLEXIBLE_TERMS.map((term) => createFlexibleTermPattern(term));

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createTokenPattern(term: string): RegExp {
  return new RegExp(`(?:^|\\s)${escapeRegex(term)}(?:$|\\s)`);
}

function createSpacedPhrasePattern(phrase: string): RegExp {
  const words = phrase.split(" ").map(escapeRegex);
  return new RegExp(`(?:^|\\s)${words.join("\\s+")}(?:$|\\s)`);
}

function createFlexibleTermPattern(term: string): RegExp {
  const characters = [...term].map((character) => `${escapeRegex(character)}+`);
  return new RegExp(`(?:^|[^a-z0-9])${characters.join("[^a-z0-9]*")}(?:$|[^a-z0-9])`);
}

function replaceModerationCharacters(value: string): string {
  return [...value].map((character) => MODERATION_CHARACTER_REPLACEMENTS.get(character) ?? character).join("");
}

function normalizeTextForModeration(text: string): ModerationText {
  const normalized = replaceModerationCharacters(
    text
      .normalize("NFKC")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/[\u034F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFE00-\uFE0F\uFEFF]/g, ""),
  );
  const spaced = normalized.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

  return {
    compact: spaced.replace(/\s+/g, ""),
    normalized,
    spaced,
  };
}

export function hasSoleraLiveBlockedPublicText(text: string): boolean {
  const moderationText = normalizeTextForModeration(text);

  return (
    BLOCKED_TOKEN_PATTERNS.some((pattern) => pattern.test(moderationText.spaced)) ||
    BLOCKED_SHORT_FLEXIBLE_PATTERNS.some((pattern) => pattern.test(moderationText.normalized)) ||
    BLOCKED_SPACED_PATTERNS.some((pattern) => pattern.test(moderationText.spaced)) ||
    BLOCKED_FLEXIBLE_PATTERNS.some((pattern) => pattern.test(moderationText.normalized)) ||
    BLOCKED_COMPACT_EXACT_TERMS.some((term) => moderationText.compact === term) ||
    BLOCKED_COMPACT_TERMS.some((term) => moderationText.compact.includes(term))
  );
}
