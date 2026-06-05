/** مفاتيح i18n لأقسام صفحة قصتنا — الصور من `IMAGES` / `STORY_SECTIONS` */

export const STORY_VALUE_IDS = [
  "joy",
  "quality",
  "luxury",
  "creative",
  "connection",
] as const;

export const STORY_TIMELINE_IDS = [
  "seeing",
  "craving",
  "buying",
  "sharing",
  "loyalty",
] as const;

export const STORY_NAMING_IDS = [
  "classic",
  "playful",
  "limited",
] as const;

export type StoryValueId = (typeof STORY_VALUE_IDS)[number];
export type StoryTimelineId = (typeof STORY_TIMELINE_IDS)[number];
export type StoryNamingId = (typeof STORY_NAMING_IDS)[number];
