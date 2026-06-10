"use client";

import { useMemo } from "react";
import Link from "next/link";
import type {
  HealthStatus,
  TopologyEdge,
  TopologyNode,
} from "@/lib/api/platform-deployments";
import { ROLE_LABEL } from "./status-badge";

/**
 * Topology DAG 시각화.
 *
 * - 노드를 role 카테고리별 column 으로 묶고 (frontend → backend → worker/db),
 *   같은 column 안에서는 status_effective 가 안 좋은 순으로 위에 둠.
 * - 엣지는 단순 직선 (Bezier 살짝). kind 에 따라 라벨.
 * - SVG 한 번에 그리고, 노드를 Link 로 감싸서 클릭하면 상세 페이지로.
 *
 * 본격적인 force-directed layout 은 노드 수가 적은 indie SaaS 시나리오에서
 * 오히려 산만해서 일부러 column 기반 정적 배치 사용.
 */

const COLUMNS: { roles: string[]; label: string }[] = [
  { roles: ["frontend"], label: "Frontend" },
  { roles: ["backend"], label: "Backend / API" },
  { roles: ["worker", "queue", "cron"], label: "Worker / Queue" },
  { roles: ["database", "cache", "storage"], label: "Data" },
  { roles: ["other"], label: "기타" },
];

const STATUS_NODE_COLOR: Record<
  HealthStatus,
  { fill: string; stroke: string; text: string }
> = {
  healthy: { fill: "fill-emerald-50 dark:fill-emerald-950/40", stroke: "stroke-emerald-500", text: "fill-emerald-700 dark:fill-emerald-300" },
  degraded: { fill: "fill-amber-50 dark:fill-amber-950/40", stroke: "stroke-amber-500", text: "fill-amber-700 dark:fill-amber-300" },
  down: { fill: "fill-rose-50 dark:fill-rose-950/40", stroke: "stroke-rose-500", text: "fill-rose-700 dark:fill-rose-300" },
  unknown: { fill: "fill-muted", stroke: "stroke-muted-foreground/40", text: "fill-muted-foreground" },
};

const NODE_W = 180;
const NODE_H = 64;
const COL_GAP = 60;
const ROW_GAP = 24;
const PAD = 24;

type Positioned = TopologyNode & { x: number; y: number; col: number };

function layoutNodes(nodes: TopologyNode[]): { positioned: Positioned[]; width: number; height: number } {
  const groups: TopologyNode[][] = COLUMNS.map(() => []);
  for (const n of nodes) {
    const idx = COLUMNS.findIndex((c) => c.roles.includes(n.role));
    groups[idx >= 0 ? idx : COLUMNS.length - 1].push(n);
  }

  // status 안 좋은 순으로 위에
  const rank: Record<HealthStatus, number> = { down: 0, degraded: 1, unknown: 2, healthy: 3 };
  groups.forEach((g) =>
    g.sort((a, b) => rank[a.status_effective] - rank[b.status_effective] || a.name.localeCompare(b.name)),
  );

  // 빈 column 은 압축 (column index 재계산)
  const nonEmpty = groups.map((g, i) => ({ g, label: COLUMNS[i].label })).filter((x) => x.g.length > 0);

  const positioned: Positioned[] = [];
  nonEmpty.forEach((col, ci) => {
    col.g.forEach((n, ri) => {
      positioned.push({
        ...n,
        col: ci,
        x: PAD + ci * (NODE_W + COL_GAP),
        y: PAD + ri * (NODE_H + ROW_GAP) + 24, // +24 for column header
      });
    });
  });

  const width = PAD * 2 + Math.max(1, nonEmpty.length) * NODE_W + Math.max(0, nonEmpty.length - 1) * COL_GAP;
  const maxRows = Math.max(1, ...nonEmpty.map((c) => c.g.length));
  const height = PAD * 2 + 24 + maxRows * (NODE_H + ROW_GAP) - ROW_GAP;

  return { positioned, width, height };
}

export function TopologyGraph({
  nodes,
  edges,
  projectId,
  height: maxHeight = 480,
}: {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  projectId: string;
  height?: number;
}) {
  const layout = useMemo(() => layoutNodes(nodes), [nodes]);
  const nodeIndex = useMemo(() => {
    const m: Record<string, Positioned> = {};
    layout.positioned.forEach((n) => (m[n.id] = n));
    return m;
  }, [layout]);

  // column headers
  const colHeaders = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const n of layout.positioned) counts[n.col] = (counts[n.col] || 0) + 1;
    const used = COLUMNS.filter((_, i) =>
      layout.positioned.some((n) => COLUMNS[i].roles.includes(n.role)),
    );
    return used.map((c, idx) => ({
      x: PAD + idx * (NODE_W + COL_GAP) + NODE_W / 2,
      label: c.label,
    }));
  }, [layout.positioned]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        등록된 배포가 없어 토폴로지를 그릴 수 없어요.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-2xl border border-border bg-card">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        style={{ width: "100%", height: "auto", maxHeight, minWidth: 320 }}
        className="block"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-muted-foreground" />
          </marker>
        </defs>

        {/* Column headers */}
        {colHeaders.map((h, i) => (
          <text
            key={i}
            x={h.x}
            y={PAD - 4}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px] font-bold uppercase tracking-wider"
          >
            {h.label}
          </text>
        ))}

        {/* Edges */}
        {edges.map((e) => {
          const s = nodeIndex[e.source];
          const t = nodeIndex[e.target];
          if (!s || !t) return null;
          const x1 = s.x + NODE_W;
          const y1 = s.y + NODE_H / 2;
          const x2 = t.x;
          const y2 = t.y + NODE_H / 2;
          const midX = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

          // dim if target is down (cascade source)
          const targetDown = t.status_effective === "down";
          return (
            <g key={e.id}>
              <path
                d={d}
                fill="none"
                className={
                  targetDown
                    ? "stroke-rose-400"
                    : "stroke-muted-foreground/40"
                }
                strokeWidth={1.5}
                strokeDasharray={e.kind === "queue" || e.kind === "webhook" ? "4 4" : undefined}
                markerEnd="url(#arrow)"
              />
            </g>
          );
        })}

        {/* Nodes */}
        {layout.positioned.map((n) => {
          const c = STATUS_NODE_COLOR[n.status_effective];
          return (
            <Link key={n.id} href={`/projects/${projectId}/deployments/${n.id}`}>
              <g style={{ cursor: "pointer" }}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={12}
                  className={`${c.fill} ${c.stroke}`}
                  strokeWidth={1.5}
                />
                <text
                  x={n.x + 12}
                  y={n.y + 20}
                  className={`${c.text} text-[12px] font-bold`}
                >
                  {n.name.length > 22 ? n.name.slice(0, 22) + "…" : n.name}
                </text>
                <text
                  x={n.x + 12}
                  y={n.y + 38}
                  className="fill-muted-foreground text-[10px]"
                >
                  {n.platform} · {ROLE_LABEL[n.role]} · {n.environment.slice(0, 4)}
                </text>
                <text
                  x={n.x + 12}
                  y={n.y + 54}
                  className={`${c.text} text-[10px] font-bold uppercase`}
                >
                  {n.status_effective}
                  {n.cascade_from && " (cascade)"}
                </text>
              </g>
            </Link>
          );
        })}
      </svg>
    </div>
  );
}
