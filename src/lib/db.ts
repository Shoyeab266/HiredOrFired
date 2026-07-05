import Dexie, { type EntityTable } from "dexie";
import type { AppSettings, InterviewSession } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

class HiredOrFiredDB extends Dexie {
  sessions!: EntityTable<InterviewSession, "id">;
  settings!: EntityTable<AppSettings & { id: string }, "id">;

  constructor() {
    super("HiredOrFiredDB");
    this.version(1).stores({
      sessions: "id, status, startedAt",
      settings: "id",
    });
  }
}

let dbInstance: HiredOrFiredDB | null = null;

function getDb(): HiredOrFiredDB {
  if (typeof window === "undefined") {
    throw new Error("Database is only available in the browser");
  }
  if (!dbInstance) {
    dbInstance = new HiredOrFiredDB();
  }
  return dbInstance;
}

const SETTINGS_KEY = "app-settings";

export async function getSettings(): Promise<AppSettings> {
  const stored = await getDb().settings.get(SETTINGS_KEY);
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...DEFAULT_SETTINGS };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await getDb().settings.put({ ...settings, id: SETTINGS_KEY });
}

export async function createSession(
  session: InterviewSession
): Promise<string> {
  await getDb().sessions.add(session);
  return session.id;
}

export async function getSession(id: string): Promise<InterviewSession | undefined> {
  return getDb().sessions.get(id);
}

export async function updateSession(
  id: string,
  updates: Partial<InterviewSession>
): Promise<void> {
  await getDb().sessions.update(id, updates);
}

export async function deleteSession(id: string): Promise<void> {
  await getDb().sessions.delete(id);
}

export async function getAllSessions(): Promise<InterviewSession[]> {
  return getDb().sessions.orderBy("startedAt").reverse().toArray();
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
