"""Diploma thesis: analysis + export for benchmark artefacts.

Consumes two input families:
  1. benchmarks/results/get_available_tasks_raw.csv   (Task 4 output)
  2. benchmarks/results/claim_race_n{N}_raw.json      (Task 5 k6 output)
     + benchmarks/results/claim_race_n{N}_summary.json

Produces:
  - analysis/out/fig_latency_hist.png          — RPC latency distribution
  - analysis/out/fig_concurrency_vs_p95.png    — N vs p95 latency line chart
  - analysis/out/fig_success_rate.png          — success/loser/error per N
  - analysis/out/summary.csv                   — N, p50, p95, p99, counts
  - analysis/out/results.tex                   — \\input-ready LaTeX fragment

Run:
  cd analysis
  pip install -r requirements.txt
  python analyze_results.py \\
      --bench-dir ../benchmarks/results \\
      --out-dir ./out
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

SCENARIOS = [10, 50, 100, 200]


@dataclass
class ClaimScenario:
    n: int
    winner_p50: float
    winner_p95: float
    winner_p99: float
    loser_p50: float
    loser_p95: float
    loser_p99: float
    success: int
    already_taken: int
    other_error: int
    winner_samples: np.ndarray
    loser_samples: np.ndarray


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------


def load_get_available_raw(path: Path) -> pd.DataFrame:
    if not path.exists():
        print(f"! {path} not found — skipping get_available analysis")
        return pd.DataFrame()
    df = pd.read_csv(path)
    return df[df["error"].isna() | (df["error"] == "")].copy()


def load_k6_raw(path: Path) -> pd.DataFrame:
    """k6 --out json writes newline-delimited JSON: one object per event."""
    if not path.exists():
        return pd.DataFrame()
    rows = []
    with path.open() as f:
        for line in f:
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return pd.DataFrame(rows)


def extract_claim_scenario(bench_dir: Path, n: int) -> ClaimScenario | None:
    raw_path = bench_dir / f"claim_race_n{n}_raw.json"
    summary_path = bench_dir / f"claim_race_n{n}_summary.json"
    if not raw_path.exists():
        print(f"! scenario n={n}: raw file missing, skipping")
        return None

    raw = load_k6_raw(raw_path)
    if raw.empty:
        return None

    points = raw[raw["type"] == "Point"].copy()
    metrics = points[["metric", "data"]].copy()
    metrics["value"] = metrics["data"].apply(lambda d: d.get("value"))

    def trend_values(name: str) -> np.ndarray:
        vals = metrics.loc[metrics["metric"] == name, "value"].astype(float)
        return vals.to_numpy()

    def counter_total(name: str) -> int:
        vals = metrics.loc[metrics["metric"] == name, "value"].astype(float)
        return int(vals.sum())

    winner = trend_values("claim_winner_duration_ms")
    loser = trend_values("claim_loser_duration_ms")

    def pct(arr: np.ndarray, p: int) -> float:
        return float(np.percentile(arr, p)) if arr.size else float("nan")

    return ClaimScenario(
        n=n,
        winner_p50=pct(winner, 50),
        winner_p95=pct(winner, 95),
        winner_p99=pct(winner, 99),
        loser_p50=pct(loser, 50),
        loser_p95=pct(loser, 95),
        loser_p99=pct(loser, 99),
        success=counter_total("claim_success_total"),
        already_taken=counter_total("claim_already_taken_total"),
        other_error=counter_total("claim_other_error_total"),
        winner_samples=winner,
        loser_samples=loser,
    )


# ---------------------------------------------------------------------------
# Plots
# ---------------------------------------------------------------------------


def plot_latency_hist(df: pd.DataFrame, out: Path) -> None:
    if df.empty:
        return
    fig, ax = plt.subplots(figsize=(8, 4.5))
    for role, group in df.groupby("role"):
        dur = group["duration_ms"].to_numpy()
        ax.hist(dur, bins=40, alpha=0.55, label=role, edgecolor="black",
                linewidth=0.3)
        for p, style in [(50, "--"), (95, "-."), (99, ":")]:
            v = np.percentile(dur, p)
            ax.axvline(v, linestyle=style, linewidth=1,
                       label=f"{role} p{p}={v:.0f}ms")
    ax.set_xlabel("Latency (ms)")
    ax.set_ylabel("Count")
    ax.set_title("get_available_tasks RPC latency distribution")
    ax.legend(fontsize=7, loc="upper right")
    fig.tight_layout()
    fig.savefig(out, dpi=160)
    plt.close(fig)


def plot_concurrency_vs_p95(scenarios: list[ClaimScenario], out: Path) -> None:
    if not scenarios:
        return
    xs = [s.n for s in scenarios]
    winner = [s.winner_p95 for s in scenarios]
    loser = [s.loser_p95 for s in scenarios]
    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.plot(xs, winner, marker="o", label="Winner p95")
    ax.plot(xs, loser, marker="s", label="Loser p95")
    ax.set_xlabel("Concurrent couriers (N)")
    ax.set_ylabel("p95 latency (ms)")
    ax.set_title("claim_delivery_task — concurrency vs p95 latency")
    ax.set_xticks(xs)
    ax.grid(True, linestyle=":", alpha=0.4)
    ax.legend()
    fig.tight_layout()
    fig.savefig(out, dpi=160)
    plt.close(fig)


def plot_success_rate(scenarios: list[ClaimScenario], out: Path) -> None:
    if not scenarios:
        return
    xs = np.arange(len(scenarios))
    width = 0.28
    succ = [s.success for s in scenarios]
    taken = [s.already_taken for s in scenarios]
    err = [s.other_error for s in scenarios]
    fig, ax = plt.subplots(figsize=(7, 4.5))
    ax.bar(xs - width, succ, width, label="Success (expected = 1)")
    ax.bar(xs, taken, width, label="Already taken (expected = N-1)")
    ax.bar(xs + width, err, width, label="Other error", color="#D05C4F")
    ax.set_xticks(xs)
    ax.set_xticklabels([str(s.n) for s in scenarios])
    ax.set_xlabel("Concurrency (N)")
    ax.set_ylabel("Response count")
    ax.set_title("claim_delivery_task — response outcomes per scenario")
    ax.legend()
    fig.tight_layout()
    fig.savefig(out, dpi=160)
    plt.close(fig)


# ---------------------------------------------------------------------------
# Exports
# ---------------------------------------------------------------------------


def export_summary_csv(scenarios: list[ClaimScenario], out: Path) -> None:
    rows = []
    for s in scenarios:
        rows.append({
            "N": s.n,
            "winner_p50_ms": round(s.winner_p50, 2),
            "winner_p95_ms": round(s.winner_p95, 2),
            "winner_p99_ms": round(s.winner_p99, 2),
            "loser_p50_ms": round(s.loser_p50, 2),
            "loser_p95_ms": round(s.loser_p95, 2),
            "loser_p99_ms": round(s.loser_p99, 2),
            "success_count": s.success,
            "already_taken_count": s.already_taken,
            "other_error_count": s.other_error,
        })
    pd.DataFrame(rows).to_csv(out, index=False)


def export_latex(
    get_available_df: pd.DataFrame,
    scenarios: list[ClaimScenario],
    out: Path,
) -> None:
    lines: list[str] = []
    lines.append("% Auto-generated by analysis/analyze_results.py")
    lines.append("% \\input this file from your thesis to pull in figures + tables.")
    lines.append("")

    # --- get_available_tasks table ---
    if not get_available_df.empty:
        lines.append("\\begin{table}[h]")
        lines.append("\\centering")
        lines.append("\\caption{\\texttt{get\\_available\\_tasks} RPC latency}")
        lines.append("\\label{tab:get-available-latency}")
        lines.append("\\begin{tabular}{lrrrr}")
        lines.append("\\hline")
        lines.append("Role & n & p50 (ms) & p95 (ms) & p99 (ms) \\\\")
        lines.append("\\hline")
        for role, group in get_available_df.groupby("role"):
            d = group["duration_ms"].to_numpy()
            lines.append(
                f"{role} & {len(d)} & {np.percentile(d, 50):.1f} & "
                f"{np.percentile(d, 95):.1f} & {np.percentile(d, 99):.1f} \\\\",
            )
        lines.append("\\hline")
        lines.append("\\end{tabular}")
        lines.append("\\end{table}")
        lines.append("")
        lines.append("\\begin{figure}[h]")
        lines.append("\\centering")
        lines.append("\\includegraphics[width=0.85\\linewidth]{out/fig_latency_hist.png}")
        lines.append(
            "\\caption{Latency distribution of \\texttt{get\\_available\\_tasks}.}",
        )
        lines.append("\\label{fig:latency-hist}")
        lines.append("\\end{figure}")
        lines.append("")

    # --- claim_delivery_task table ---
    if scenarios:
        lines.append("\\begin{table}[h]")
        lines.append("\\centering")
        lines.append(
            "\\caption{\\texttt{claim\\_delivery\\_task} — concurrent claim outcomes}",
        )
        lines.append("\\label{tab:claim-concurrency}")
        lines.append("\\begin{tabular}{rrrrrrr}")
        lines.append("\\hline")
        lines.append(
            "N & Winner p50 & Winner p95 & Loser p95 & Success & Already taken & Other err \\\\",
        )
        lines.append("\\hline")
        for s in scenarios:
            lines.append(
                f"{s.n} & {s.winner_p50:.0f} & {s.winner_p95:.0f} & "
                f"{s.loser_p95:.0f} & {s.success} & {s.already_taken} & "
                f"{s.other_error} \\\\",
            )
        lines.append("\\hline")
        lines.append("\\end{tabular}")
        lines.append("\\end{table}")
        lines.append("")
        lines.append("\\begin{figure}[h]")
        lines.append("\\centering")
        lines.append(
            "\\includegraphics[width=0.75\\linewidth]{out/fig_concurrency_vs_p95.png}",
        )
        lines.append(
            "\\caption{p95 latency under increasing concurrency.}",
        )
        lines.append("\\label{fig:concurrency-p95}")
        lines.append("\\end{figure}")
        lines.append("")
        lines.append("\\begin{figure}[h]")
        lines.append("\\centering")
        lines.append(
            "\\includegraphics[width=0.75\\linewidth]{out/fig_success_rate.png}",
        )
        lines.append(
            "\\caption{Response outcomes per concurrency scenario. Expect exactly "
            "one winner and $N-1$ losers per scenario.}",
        )
        lines.append("\\label{fig:success-rate}")
        lines.append("\\end{figure}")

    out.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bench-dir", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    args = parser.parse_args()

    args.out_dir.mkdir(parents=True, exist_ok=True)

    # Task 4: get_available_tasks histogram
    ga = load_get_available_raw(args.bench_dir / "get_available_tasks_raw.csv")
    plot_latency_hist(ga, args.out_dir / "fig_latency_hist.png")

    # Task 5: claim race scenarios
    scenarios: list[ClaimScenario] = []
    for n in SCENARIOS:
        s = extract_claim_scenario(args.bench_dir, n)
        if s:
            scenarios.append(s)

    plot_concurrency_vs_p95(scenarios, args.out_dir / "fig_concurrency_vs_p95.png")
    plot_success_rate(scenarios, args.out_dir / "fig_success_rate.png")
    export_summary_csv(scenarios, args.out_dir / "summary.csv")
    export_latex(ga, scenarios, args.out_dir / "results.tex")

    print(f"Wrote outputs to {args.out_dir.resolve()}")


if __name__ == "__main__":
    main()
