export const reactionOptions = [
  { key: "legendary", label: "Legendär" },
  { key: "cursed", label: "Cursed" },
  { key: "classic", label: "Klassiker" },
  { key: "wild", label: "Zu wild" },
] as const;

export type ReactionKey = (typeof reactionOptions)[number]["key"];

export function isReactionKey(value: string): value is ReactionKey {
  return reactionOptions.some((option) => option.key === value);
}
