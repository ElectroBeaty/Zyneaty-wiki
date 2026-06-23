export const reactionOptions = [{ key: "fire", label: "🔥 Fire" }] as const;

export type ReactionKey = (typeof reactionOptions)[number]["key"];

export function isReactionKey(value: string): value is ReactionKey {
  return reactionOptions.some((option) => option.key === value);
}
