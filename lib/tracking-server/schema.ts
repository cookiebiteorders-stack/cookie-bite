import { z } from "zod";

const stringMax = (max: number) => z.string().min(1).max(max);

const DeviceSchema = z
  .object({
    device_type: z.enum(["mobile", "tablet", "desktop"]),
    browser: z.string().max(80).optional(),
    browser_version: z.string().max(40).optional(),
    os: z.string().max(80).optional(),
    os_version: z.string().max(40).optional(),
    screen_width: z.number().int().positive().max(20000).optional(),
    screen_height: z.number().int().positive().max(20000).optional(),
    viewport_width: z.number().int().positive().max(20000).optional(),
    viewport_height: z.number().int().positive().max(20000).optional(),
    device_pixel_ratio: z.number().positive().max(10).optional(),
    language: z.string().max(20).optional(),
    timezone: z.string().max(60).optional(),
    user_agent: z.string().max(1000).optional(),
    is_bot: z.boolean().optional(),
  })
  .strict();

const VisitorSchema = z
  .object({
    visitor_id: stringMax(64),
    session_id: stringMax(64),
    fingerprint: stringMax(64).optional(),
    user_id: stringMax(64).nullish(),
  })
  .strict();

const PageSchema = z
  .object({
    url: z.string().max(2048).default(""),
    path: z.string().max(1024).default("/"),
    hash: z.string().max(512).nullish(),
    search: z.string().max(2048).nullish(),
    title: z.string().max(512).nullish(),
    referrer: z.string().max(2048).nullish(),
  })
  .strict();

const UtmSchema = z
  .object({
    utm_source: z.string().max(128).nullish(),
    utm_medium: z.string().max(128).nullish(),
    utm_campaign: z.string().max(255).nullish(),
    utm_term: z.string().max(255).nullish(),
    utm_content: z.string().max(255).nullish(),
    gclid: z.string().max(255).nullish(),
    fbclid: z.string().max(255).nullish(),
  })
  .partial()
  .optional();

const EventSchema = z
  .object({
    event_id: stringMax(80),
    name: z.string().min(1).max(80),
    timestamp: z.string().datetime({ offset: true }),
    visitor_id: stringMax(64),
    session_id: stringMax(64),
    user_id: stringMax(64).nullish(),
    page: PageSchema,
    device: DeviceSchema,
    utm: UtmSchema,
    properties: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export const TrackBatchSchema = z
  .object({
    sdk: z.string().max(20),
    visitor: VisitorSchema,
    device: DeviceSchema,
    page: PageSchema,
    utm: UtmSchema,
    events: z.array(EventSchema).min(1).max(50),
  })
  .strict();

export type ParsedTrackBatch = z.infer<typeof TrackBatchSchema>;
export type ParsedTrackEvent = z.infer<typeof EventSchema>;
