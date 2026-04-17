import { appendFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";

/**
 * Append-only CSV writer — flushes each row synchronously so a crash mid-run
 * still leaves the partial file intact for post-mortem analysis.
 */
export class CsvWriter {
  private headerWritten = false;

  constructor(private readonly path: string, private readonly columns: string[]) {
    mkdirSync(dirname(path), { recursive: true });
  }

  write(row: Record<string, unknown>): void {
    if (!this.headerWritten) {
      writeFileSync(this.path, this.columns.join(",") + "\n");
      this.headerWritten = true;
    }
    const escaped = this.columns
      .map((col) => {
        const v = row[col];
        if (v === undefined || v === null) return "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(",");
    appendFileSync(this.path, escaped + "\n");
  }
}
