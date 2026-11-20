import { z } from "zod";

// Validate config once at startup. A missing or weak secret crashes the app now,
// not later in the middle of a user's request (fail fast).
const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  // Optional, e.g. "1.1.1.1,8.8.8.8". Only for machines whose local DNS refuses the SRV
  // lookups that mongodb+srv:// URLs need (seen as "querySrv ECONNREFUSED").
  DNS_SERVERS: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),

  // Bloom filter sizing: expected number of users and accepted false-positive rate
  BLOOM_EXPECTED_ITEMS: z.coerce.number().int().positive().default(1_000_000),
  BLOOM_FALSE_POSITIVE_RATE: z.coerce.number().gt(0).lt(1).default(0.01),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment config:");
  for (const issue of parsed.error.issues) console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  process.exit(1);
}

if (parsed.data.JWT_ACCESS_SECRET === parsed.data.JWT_REFRESH_SECRET) {
  console.error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different.");
  process.exit(1);
}

export const env = Object.freeze({ ...parsed.data, isProd: parsed.data.NODE_ENV === "production" });
