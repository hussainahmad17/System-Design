import { z } from "zod";

// Input validation: reject bad data at the edge, before it reaches the DB.
// Normalise here (trim + lowercase) so every lookup hits the index with an exact match.

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254));

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-z0-9._]+$/, "Use only letters, numbers, dots and underscores");

// Max length caps the hashing work an attacker can force with a huge password
const password = z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long");

const name = (label) => z.string().trim().min(1, `${label} is required`).max(50, `${label} is too long`);

export const registerSchema = z.object({
  username,
  email,
  password,
  firstName: name("First name"),
  lastName: name("Last name"),
});

export const loginSchema = z.object({
  // One box for email or username, like most stores
  identifier: z.string().trim().toLowerCase().min(3, "Enter your email or username").max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

// Exactly one of email / username
export const availabilitySchema = z
  .object({ email: email.optional(), username: username.optional() })
  .strict()
  .refine((q) => (q.email === undefined) !== (q.username === undefined), {
    message: "Send either ?email= or ?username=, not both",
  });
