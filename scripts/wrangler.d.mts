import type { ChildProcess, SpawnOptions } from 'node:child_process';
export const wranglerEnv: NodeJS.ProcessEnv;
export function wrangler(args: string[], options?: SpawnOptions): ChildProcess;
