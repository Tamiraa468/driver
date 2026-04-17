/**
 * Early .env validator — catches the common "I forgot to fill in placeholders"
 * failure before a Supabase client is constructed with a malformed URL.
 *
 * Detects:
 *   - Missing vars
 *   - Literal <angle-bracket> placeholder text (from .env.example)
 *   - Obvious URL corruption
 *
 * Usage: import validateEnv and call at the very top of every entry script.
 */

export interface EnvRequirement {
  key: string;
  description: string;
  urlLike?: boolean;
}

export function validateEnv(reqs: EnvRequirement[]): void {
  const problems: string[] = [];
  for (const r of reqs) {
    const v = process.env[r.key];
    if (v === undefined || v === "") {
      problems.push(`  - ${r.key} is not set (${r.description})`);
      continue;
    }
    if (/<[^>]+>/.test(v)) {
      problems.push(
        `  - ${r.key} still contains placeholder text "${v}" — edit .env and paste the real value`,
      );
      continue;
    }
    if (r.urlLike) {
      try {
        new URL(v);
      } catch {
        problems.push(`  - ${r.key}="${v}" is not a valid URL`);
      }
    }
  }
  if (problems.length > 0) {
    console.error("\n[env] validation failed:");
    for (const p of problems) console.error(p);
    console.error(
      "\nOpen .env in your editor and replace every <...> placeholder:",
    );
    console.error("  open -e ./.env   # TextEdit");
    console.error("  code ./.env      # VS Code\n");
    process.exit(1);
  }
}
