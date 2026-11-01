import "server-only";
import { cache } from "react";
import { db } from "@/db";

interface Settings {
  universityName: string;
  slogan: string;
  about: string;
  maxCreditsPerTerm: number;
  probationBelow: number;
}

const DEFAULTS: Settings = {
  universityName: "Swan University",
  slogan: "",
  about: "",
  maxCreditsPerTerm: 22,
  probationBelow: 2,
};

const KEYS: Record<string, keyof Settings> = {
  university_name: "universityName",
  slogan: "slogan",
  about: "about",
  max_credits_per_term: "maxCreditsPerTerm",
  probation_below: "probationBelow",
};

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.query.settings.findMany();
  const out: Settings = { ...DEFAULTS };
  for (const row of rows) {
    const key = KEYS[row.key];
    if (key) (out as unknown as Record<string, unknown>)[key] = row.value;
  }
  return out;
});

export const SETTING_KEYS = KEYS;
