import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '..');

export interface Persona {
  id: string;
  name: string;
  role: string;
  engine: string;
  color: string;
  desk_spot: string;
}

export interface Config {
  port: number;
  dbPath: string;
  ingestTokenFile: string | null;
  staleMinClaude: number;
  staleMinAgy: number;
  personasPath: string;
  personas: Persona[];
  publicDir: string;
  claudeProjectsDir: string | null;
  scanIntervalS: number;
  scanMaxAgeDays: number;
  pricingPath: string;
}

export function loadPersonas(personasPath: string): Persona[] {
  const content = fs.readFileSync(personasPath, 'utf8');
  return JSON.parse(content) as Persona[];
}

export function loadConfig(overrides: Partial<Config> = {}): Config {
  const port = overrides.port ?? (process.env.KANTOR_PORT ? parseInt(process.env.KANTOR_PORT, 10) : 8790);
  const dbPath = overrides.dbPath ?? (process.env.KANTOR_DB || path.join(PROJECT_ROOT, 'data', 'kantor.db'));
  const ingestTokenFile = overrides.ingestTokenFile !== undefined
    ? overrides.ingestTokenFile
    : (process.env.KANTOR_INGEST_TOKEN_FILE || null);
  const staleMinClaude = overrides.staleMinClaude ?? (process.env.KANTOR_STALE_MIN_CLAUDE ? parseInt(process.env.KANTOR_STALE_MIN_CLAUDE, 10) : 30);
  const staleMinAgy = overrides.staleMinAgy ?? (process.env.KANTOR_STALE_MIN_AGY ? parseInt(process.env.KANTOR_STALE_MIN_AGY, 10) : 60);
  const personasPath = overrides.personasPath ?? path.join(PROJECT_ROOT, 'config', 'personas.json');
  const personas = overrides.personas ?? loadPersonas(personasPath);
  const publicDir = overrides.publicDir ?? path.join(PROJECT_ROOT, 'public');
  const claudeProjectsDir = overrides.claudeProjectsDir !== undefined
    ? overrides.claudeProjectsDir
    : (process.env.KANTOR_CLAUDE_PROJECTS || null);
  const scanIntervalS = overrides.scanIntervalS ?? (process.env.KANTOR_SCAN_INTERVAL_S ? parseInt(process.env.KANTOR_SCAN_INTERVAL_S, 10) : 60);
  const scanMaxAgeDays = overrides.scanMaxAgeDays ?? (process.env.KANTOR_SCAN_MAX_AGE_DAYS ? parseInt(process.env.KANTOR_SCAN_MAX_AGE_DAYS, 10) : 7);
  const pricingPath = overrides.pricingPath ?? (process.env.KANTOR_PRICING_FILE || path.join(PROJECT_ROOT, 'config', 'pricing.json'));

  return {
    port,
    dbPath,
    ingestTokenFile,
    staleMinClaude,
    staleMinAgy,
    personasPath,
    personas,
    publicDir,
    claudeProjectsDir,
    scanIntervalS,
    scanMaxAgeDays,
    pricingPath,
  };
}

export const defaultConfig = loadConfig();
