"use client";

import { useState, useMemo } from "react";
import {
  classesNeeded,
  classesCanMiss,
  analyzeAttendance,
  type AttendanceAnalysis,
  type SubjectAttendance,
  type ClassRecord,
  type ParseResult,
} from "@/lib/parser";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Target,
  Trash2,
  ArrowRight,
  Calendar,
  List,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";

// ─── Constants ─────────────────────────────────────────────

const COLORS = {
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#eab308",
  blue: "#3b82f6",
  purple: "#a855f7",
  orange: "#f97316",
  cyan: "#06b6d4",
  pink: "#ec4899",
};

function getStatusColor(pct: number, threshold: number) {
  if (pct >= threshold) return "text-emerald-400";
  if (pct >= threshold * 0.67) return "text-yellow-400";
  return "text-red-400";
}

function getStatusBg(pct: number, threshold: number) {
  if (pct >= threshold) return "bg-emerald-500/10 border-emerald-500/20";
  if (pct >= threshold * 0.67) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function getBarColor(pct: number, threshold: number) {
  if (pct >= threshold) return COLORS.green;
  if (pct >= threshold * 0.67) return COLORS.yellow;
  return COLORS.red;
}

// ─── Stat Card ─────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-2 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <span className="text-zinc-400 text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

// ─── Subject Row ───────────────────────────────────────────

function SubjectRow({
  subject,
  threshold,
}: {
  subject: SubjectAttendance;
  threshold: number;
}) {
  const needed = classesNeeded(subject, threshold);
  const canMiss = classesCanMiss(subject, threshold);
  const isAtRisk = subject.percentage < threshold;

  return (
    <div
      className={`border rounded-xl p-4 transition-all hover:scale-[1.01] ${getStatusBg(
        subject.percentage,
        threshold,
      )}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold truncate">
              {subject.name}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
              {subject.code}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                subject.type === "Lab"
                  ? "bg-purple-500/20 text-purple-300"
                  : "bg-blue-500/20 text-blue-300"
              }`}
            >
              {subject.type}
            </span>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-zinc-400">
            <span>
              Present:{" "}
              <span className="text-emerald-400">{subject.present}</span>
            </span>
            <span>
              Absent: <span className="text-red-400">{subject.absent}</span>
            </span>
            {subject.od > 0 && (
              <span>
                OD: <span className="text-blue-400">{subject.od}</span>
              </span>
            )}
            <span>
              Total:{" "}
              <span className="text-zinc-300">{subject.totalClasses}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-32 hidden sm:block">
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(subject.percentage, 100)}%`,
                  backgroundColor: getBarColor(subject.percentage, threshold),
                }}
              />
            </div>
          </div>
          <span
            className={`text-xl font-bold min-w-16 text-right ${getStatusColor(
              subject.percentage,
              threshold,
            )}`}
          >
            {subject.percentage.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="mt-2 text-xs">
        {isAtRisk ? (
          <span className="text-red-400 flex items-center gap-1">
            <AlertTriangle size={12} />
            Attend next <strong>{needed}</strong> classes consecutively to reach{" "}
            {threshold}%
          </span>
        ) : (
          <span className="text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={12} />
            Can miss <strong>{canMiss}</strong> more classes and stay above{" "}
            {threshold}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Threshold Selector ────────────────────────────────────

function ThresholdSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const presets = [60, 65, 70, 75, 80, 85];
  return (
    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
      <SlidersHorizontal size={14} className="text-zinc-500" />
      <span className="text-xs text-zinc-400 hidden sm:inline">Threshold:</span>
      <div className="flex gap-1">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              value === p
                ? "bg-indigo-600 text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            {p}%
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Individual Breakdown View ─────────────────────────────

function IndividualBreakdown({
  records,
  threshold,
}: {
  records: ClassRecord[];
  threshold: number;
}) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("all");

  // Group by subject
  const bySubject = useMemo(() => {
    const map = new Map<string, ClassRecord[]>();
    for (const r of records) {
      if (!map.has(r.code)) map.set(r.code, []);
      map.get(r.code)!.push(r);
    }
    return map;
  }, [records]);

  // Group by date
  const byDate = useMemo(() => {
    const filtered =
      filterSubject === "all"
        ? records
        : records.filter((r) => r.code === filterSubject);
    const map = new Map<string, ClassRecord[]>();
    for (const r of filtered) {
      const dateKey = r.date;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(r);
    }
    // Sort by date descending
    return new Map(
      [...map.entries()].sort((a, b) => {
        const da = a[0].match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
        const db = b[0].match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
        return db.localeCompare(da);
      }),
    );
  }, [records, filterSubject]);

  const subjectCodes = useMemo(() => {
    const codes = [...new Set(records.map((r) => r.code))];
    return codes.sort();
  }, [records]);

  // Subject-wise stats
  const subjectStats = useMemo(() => {
    const stats: {
      code: string;
      name: string;
      present: number;
      absent: number;
      od: number;
      total: number;
      pct: number;
      records: ClassRecord[];
    }[] = [];
    for (const [code, recs] of bySubject) {
      const p = recs.filter((r) => r.status === "P").length;
      const a = recs.filter((r) => r.status === "A").length;
      const od = recs.filter((r) => r.status === "OD").length;
      const total = p + a + od;
      stats.push({
        code,
        name: recs[0].subject,
        present: p,
        absent: a,
        od,
        total,
        pct: total > 0 ? ((p + od) / total) * 100 : 0,
        records: recs,
      });
    }
    return stats.sort((a, b) => a.code.localeCompare(b.code));
  }, [bySubject]);

  return (
    <div className="space-y-6">
      {/* Subject-wise collapsible cards */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <BookOpen size={20} /> Subject-wise Breakdown
        </h2>
        <div className="space-y-2">
          {subjectStats.map((s) => {
            const isOpen = expandedSubject === s.code;
            return (
              <div
                key={s.code}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSubject(isOpen ? null : s.code)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <ChevronDown size={16} className="text-zinc-500" />
                    ) : (
                      <ChevronRight size={16} className="text-zinc-500" />
                    )}
                    <div className="text-left">
                      <div className="text-white font-medium">{s.name}</div>
                      <div className="text-zinc-500 text-xs font-mono">
                        {s.code}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-xs text-zinc-400 hidden sm:flex gap-3">
                      <span>
                        P: <span className="text-emerald-400">{s.present}</span>
                      </span>
                      <span>
                        A: <span className="text-red-400">{s.absent}</span>
                      </span>
                      {s.od > 0 && (
                        <span>
                          OD: <span className="text-blue-400">{s.od}</span>
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-lg font-bold ${getStatusColor(
                        s.pct,
                        threshold,
                      )}`}
                    >
                      {s.pct.toFixed(1)}%
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-zinc-800 p-4">
                    <div className="space-y-1.5">
                      {s.records.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-950/50 text-sm"
                        >
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              r.status === "P"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : r.status === "OD"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {r.status}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-zinc-300">
                              <Calendar size={12} className="text-zinc-500" />
                              <span className="text-xs">{r.date}</span>
                              <Clock size={12} className="text-zinc-500 ml-1" />
                              <span className="text-xs">{r.time}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <User size={12} />
                            <span className="hidden md:inline truncate max-w-40">
                              {r.faculty}
                            </span>
                          </div>
                          {r.isMakeup && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                              MAKEUP
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Date-wise timeline */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-300 flex items-center gap-2">
            <Calendar size={20} /> Date-wise Timeline
          </h2>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm text-zinc-300 cursor-pointer focus:outline-none focus:border-indigo-500/50"
          >
            <option value="all">All Subjects</option>
            {subjectCodes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-4">
          {[...byDate.entries()].map(([date, recs]) => (
            <div key={date}>
              <div className="text-xs font-medium text-zinc-500 mb-2 pl-1">
                {date}
              </div>
              <div className="space-y-1.5">
                {recs
                  .sort((a, b) => {
                    // Sort by time descending within a day
                    const ta = a.time;
                    const tb = b.time;
                    return tb.localeCompare(ta);
                  })
                  .map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800"
                    >
                      <span
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                          r.status === "P"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : r.status === "OD"
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {r.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {r.subject}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                          <span className="font-mono">{r.code}</span>
                          <span>·</span>
                          <span>{r.type}</span>
                          <span>·</span>
                          <span>{r.time}</span>
                          <span>·</span>
                          <span>{r.hours}h</span>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-500 hidden sm:flex items-center gap-1">
                        <User size={12} />
                        <span className="truncate max-w-32">{r.faculty}</span>
                      </div>
                      {r.isMakeup && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                          MAKEUP
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Overview View ─────────────────────────────────────────

function OverviewView({
  analysis,
  threshold,
}: {
  analysis: AttendanceAnalysis;
  threshold: number;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "lectures" | "labs">(
    "all",
  );

  const {
    subjects,
    overall,
    lectures,
    labs,
    atRisk,
    safe,
    bestSubject,
    worstSubject,
  } = analysis;

  const displaySubjects = (
    activeTab === "lectures" ? lectures : activeTab === "labs" ? labs : subjects
  )
    .slice()
    .sort((a, b) => a.percentage - b.percentage);

  const barData = subjects
    .slice()
    .sort((a, b) => a.percentage - b.percentage)
    .map((s) => ({
      name: s.code,
      fullName: s.name,
      percentage: s.percentage,
      fill: getBarColor(s.percentage, threshold),
    }));

  const pieData = [
    { name: "Present", value: overall.totalPresent, color: COLORS.green },
    { name: "Absent", value: overall.totalAbsent, color: COLORS.red },
    ...(overall.totalOD > 0
      ? [{ name: "OD", value: overall.totalOD, color: COLORS.blue }]
      : []),
    ...(overall.totalMakeup > 0
      ? [{ name: "Makeup", value: overall.totalMakeup, color: COLORS.purple }]
      : []),
  ];

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload?.[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold text-sm">{data.fullName}</p>
          <p className="text-zinc-400 text-xs">{data.name}</p>
          <p
            className={`text-lg font-bold ${getStatusColor(data.percentage, threshold)}`}
          >
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <section>
        <h2 className="text-lg font-semibold text-zinc-300 mb-4 flex items-center gap-2">
          <BarChart3 size={20} /> Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Target}
            label="Overall Attendance"
            value={`${overall.overallPercentage.toFixed(1)}%`}
            sub={`${overall.totalPresent + overall.totalOD + overall.totalMakeup} / ${overall.totalClasses} classes`}
            color="bg-indigo-500/20 text-indigo-400"
          />
          <StatCard
            icon={CheckCircle2}
            label="Safe Subjects"
            value={safe.length}
            sub={`≥${threshold}% · ${subjects.length > 0 ? ((safe.length / subjects.length) * 100).toFixed(0) : 0}% of total`}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <StatCard
            icon={AlertTriangle}
            label="At-Risk Subjects"
            value={atRisk.length}
            sub={`Below ${threshold}%`}
            color="bg-red-500/20 text-red-400"
          />
          <StatCard
            icon={BookOpen}
            label="Total Subjects"
            value={subjects.length}
            sub={`${lectures.length} lectures, ${labs.length} labs`}
            color="bg-purple-500/20 text-purple-400"
          />
        </div>
      </section>

      {/* Best / Worst */}
      {bestSubject && worstSubject && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
              <TrendingUp size={16} /> Best Attendance
            </div>
            <div className="text-white font-bold text-lg">
              {bestSubject.name}
            </div>
            <div className="text-emerald-400 text-2xl font-bold">
              {bestSubject.percentage.toFixed(1)}%
            </div>
            <div className="text-zinc-500 text-xs mt-1">
              {bestSubject.present}/{bestSubject.totalClasses} classes attended
            </div>
          </div>
          <div className="bg-zinc-900 border border-red-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-2">
              <TrendingDown size={16} /> Needs Improvement
            </div>
            <div className="text-white font-bold text-lg">
              {worstSubject.name}
            </div>
            <div className="text-red-400 text-2xl font-bold">
              {worstSubject.percentage.toFixed(1)}%
            </div>
            <div className="text-zinc-500 text-xs mt-1">
              {worstSubject.present}/{worstSubject.totalClasses} classes
              attended
              {classesNeeded(worstSubject, threshold) > 0 &&
                ` · Need ${classesNeeded(worstSubject, threshold)} more to reach ${threshold}%`}
            </div>
          </div>
        </section>
      )}

      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-zinc-300 font-semibold mb-4">
            Attendance by Subject
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={barData}
              margin={{ top: 5, right: 10, bottom: 5, left: -10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="name"
                tick={{ fill: "#71717a", fontSize: 10 }}
                axisLine={{ stroke: "#3f3f46" }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#71717a", fontSize: 12 }}
                axisLine={{ stroke: "#3f3f46" }}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-zinc-300 font-semibold mb-4">
            Overall Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                }}
                itemStyle={{ color: "#fff" }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value: string) => (
                  <span className="text-zinc-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Subject List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-300">
            Subject Details
          </h2>
          <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {(
              [
                ["all", "All", subjects.length],
                ["lectures", "Lectures", lectures.length],
                ["labs", "Labs", labs.length],
              ] as const
            ).map(([key, label, count]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  activeTab === key
                    ? "bg-indigo-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {label} <span className="text-xs opacity-60">({count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {displaySubjects.map((s) => (
            <SubjectRow key={s.id} subject={s} threshold={threshold} />
          ))}
        </div>
      </section>

      {/* Recovery Plan */}
      {atRisk.length > 0 && (
        <section className="bg-linear-to-br from-red-500/5 to-orange-500/5 border border-red-500/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} /> Recovery Plan
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Here&apos;s what you need to do to reach {threshold}% in each
            at-risk subject:
          </p>
          <div className="space-y-3">
            {atRisk
              .sort((a, b) => a.percentage - b.percentage)
              .map((s) => {
                const needed = classesNeeded(s, threshold);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 bg-zinc-900/60 rounded-xl p-4 border border-zinc-800"
                  >
                    <div className="flex-1">
                      <div className="text-white font-medium">{s.name}</div>
                      <div className="text-zinc-500 text-xs">
                        Currently {s.percentage.toFixed(1)}%
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-zinc-600" />
                    <div className="text-right">
                      <div className="text-orange-400 font-bold">
                        +{needed} classes
                      </div>
                      <div className="text-zinc-500 text-xs">
                        to reach {threshold}%
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────

export default function Dashboard({
  parseResult,
  onReset,
}: {
  parseResult: ParseResult;
  onReset: () => void;
}) {
  const [threshold, setThreshold] = useState(75);
  const [view, setView] = useState<"overview" | "individual">("overview");

  const analysis = useMemo(
    () => analyzeAttendance(parseResult, threshold),
    [parseResult, threshold],
  );

  const hasDetailedData = parseResult.format === "detailed";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Attendify
              </h1>
              <p className="text-zinc-500 text-sm">
                Attendance Analytics Dashboard
              </p>
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              New Analysis
            </button>
          </div>

          {/* Navbar + Threshold */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-4">
            {/* View tabs (only show if detailed data) */}
            {hasDetailedData ? (
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                <button
                  onClick={() => setView("overview")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    view === "overview"
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BarChart3 size={14} />
                  Subject Overview
                </button>
                <button
                  onClick={() => setView("individual")}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
                    view === "individual"
                      ? "bg-indigo-600 text-white"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <List size={14} />
                  Class-by-Class
                </button>
              </div>
            ) : (
              <div />
            )}

            <ThresholdSelector value={threshold} onChange={setThreshold} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {view === "overview" ? (
          <OverviewView analysis={analysis} threshold={threshold} />
        ) : (
          <IndividualBreakdown
            records={analysis.records}
            threshold={threshold}
          />
        )}

        <footer className="text-center text-zinc-600 text-xs py-8">
          Attendify — Paste your attendance, understand your progress.
        </footer>
      </div>
    </div>
  );
}
