// ─── Types ─────────────────────────────────────────────────

export interface SubjectAttendance {
  id: number;
  code: string;
  name: string;
  type: "Lecture" | "Lab" | string;
  present: number;
  od: number;
  makeup: number;
  absent: number;
  percentage: number;
  totalClasses: number;
}

/** Individual class record (from detailed/sample2 format) */
export interface ClassRecord {
  rowId: number;
  code: string;
  subject: string;
  isMakeup: boolean;
  type: "Lecture" | "Lab" | string;
  faculty: string;
  date: string; // "2026-02-14 (Saturday)"
  time: string; // "2:30 PM"
  hours: number;
  status: "P" | "A" | "OD" | string;
}

export type DataFormat = "summary" | "detailed";

export interface ParseResult {
  format: DataFormat;
  subjects: SubjectAttendance[];
  records: ClassRecord[]; // only populated for "detailed"
}

export interface AttendanceAnalysis {
  format: DataFormat;
  subjects: SubjectAttendance[];
  records: ClassRecord[];
  overall: {
    totalPresent: number;
    totalAbsent: number;
    totalOD: number;
    totalMakeup: number;
    totalClasses: number;
    overallPercentage: number;
  };
  lectures: SubjectAttendance[];
  labs: SubjectAttendance[];
  atRisk: SubjectAttendance[];
  safe: SubjectAttendance[];
  bestSubject: SubjectAttendance | null;
  worstSubject: SubjectAttendance | null;
}

// ─── Format Detection ──────────────────────────────────────

function detectFormat(lines: string[]): DataFormat {
  // Detailed format has P/A/OD as last column and date patterns
  for (const line of lines.slice(0, 20)) {
    const parts = line.split("\t").map((p) => p.trim());
    if (parts.length < 8) continue;
    const last = parts[parts.length - 1];
    if (["P", "A", "OD"].includes(last)) return "detailed";
  }
  return "summary";
}

// ─── Summary Parser (Sample 1) ────────────────────────────

function parseSummary(lines: string[]): SubjectAttendance[] {
  const subjects: SubjectAttendance[] = [];

  for (const line of lines) {
    // Regex for space-separated
    const match = line.match(
      /^(\d+)\s+(\S+)\s+(.+?)\s+(Lecture|Lab)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)$/,
    );
    if (match) {
      const present = parseInt(match[5]);
      const od = parseInt(match[6]);
      const makeup = parseInt(match[7]);
      const absent = parseInt(match[8]);
      subjects.push({
        id: parseInt(match[1]),
        code: match[2],
        name: match[3].trim(),
        type: match[4],
        present,
        od,
        makeup,
        absent,
        percentage: parseFloat(match[9]),
        totalClasses: present + od + makeup + absent,
      });
    }
  }

  // Fallback: tab-separated
  if (subjects.length === 0) {
    for (const line of lines) {
      const parts = line.split("\t").map((p) => p.trim());
      if (parts.length >= 9 && /^\d+$/.test(parts[0])) {
        const present = parseInt(parts[4]);
        const od = parseInt(parts[5]);
        const makeup = parseInt(parts[6]);
        const absent = parseInt(parts[7]);
        if (isNaN(present) || isNaN(od) || isNaN(makeup) || isNaN(absent))
          continue;
        subjects.push({
          id: parseInt(parts[0]),
          code: parts[1],
          name: parts[2],
          type: parts[3],
          present,
          od,
          makeup,
          absent,
          percentage: parseFloat(parts[8]),
          totalClasses: present + od + makeup + absent,
        });
      }
    }
  }

  return subjects;
}

// ─── Detailed Parser (Sample 2) ───────────────────────────

function parseDetailed(lines: string[]): {
  records: ClassRecord[];
  subjects: SubjectAttendance[];
} {
  const records: ClassRecord[] = [];

  for (const line of lines) {
    const parts = line.split("\t").map((p) => p.trim());
    if (parts.length < 8 || !/^\d+$/.test(parts[0])) continue;

    const last = parts[parts.length - 1];
    if (!["P", "A", "OD"].includes(last)) continue;

    // Detect if there's a MAKEUP column (extra field shifts things)
    // Normal:  #, Code, Subject, Type, Faculty, Date, Time, Hours, Status
    // Makeup:  #, Code, Subject, MAKEUP, Type, Faculty, Date, Time, Hours, Status
    const hasMakeupCol = parts.length >= 10 && parts[3] === "MAKEUP";

    const offset = hasMakeupCol ? 1 : 0;

    records.push({
      rowId: parseInt(parts[0]),
      code: parts[1],
      subject: parts[2],
      isMakeup: hasMakeupCol,
      type: parts[3 + offset], // Lecture or Lab
      faculty: parts[4 + offset],
      date: parts[5 + offset],
      time: parts[6 + offset],
      hours: parseInt(parts[7 + offset]) || 1,
      status: last,
    });
  }

  // Aggregate into SubjectAttendance
  const map = new Map<
    string,
    {
      code: string;
      name: string;
      type: string;
      p: number;
      a: number;
      od: number;
      mk: number;
    }
  >();

  for (const r of records) {
    const key = r.code;
    if (!map.has(key)) {
      map.set(key, {
        code: r.code,
        name: r.subject,
        type: r.type,
        p: 0,
        a: 0,
        od: 0,
        mk: 0,
      });
    }
    const entry = map.get(key)!;
    const w = r.hours; // weight by hours so labs match hour-based totals

    // Makeup classes only count if attended (P/OD).
    // If absent in a makeup class, it doesn't affect attendance at all.
    if (r.isMakeup && r.status === "A") {
      continue;
    }

    if (r.status === "P") entry.p += w;
    else if (r.status === "A") entry.a += w;
    else if (r.status === "OD") entry.od += w;
    if (r.isMakeup) entry.mk += w;
  }

  const subjects: SubjectAttendance[] = [];
  let id = 1;
  for (const [, v] of map) {
    const total = v.p + v.a + v.od;
    const pct = total > 0 ? ((v.p + v.od) / total) * 100 : 0;
    subjects.push({
      id: id++,
      code: v.code,
      name: v.name,
      type: v.type,
      present: v.p,
      od: v.od,
      makeup: v.mk,
      absent: v.a,
      percentage: Math.round(pct * 100) / 100,
      totalClasses: total,
    });
  }

  return { records, subjects };
}

// ─── Unified Parse Entry Point ─────────────────────────────

export function parseAttendanceData(raw: string): ParseResult {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const format = detectFormat(lines);

  if (format === "detailed") {
    const { records, subjects } = parseDetailed(lines);
    return { format, subjects, records };
  }

  return { format, subjects: parseSummary(lines), records: [] };
}

/** Backward-compat alias */
export function parseAttendanceTable(raw: string): SubjectAttendance[] {
  return parseAttendanceData(raw).subjects;
}

// ─── Analysis ──────────────────────────────────────────────

export function analyzeAttendance(
  parseResult: ParseResult,
  threshold: number = 75,
): AttendanceAnalysis {
  const { subjects, records, format } = parseResult;

  const totalPresent = subjects.reduce((a, s) => a + s.present, 0);
  const totalAbsent = subjects.reduce((a, s) => a + s.absent, 0);
  const totalOD = subjects.reduce((a, s) => a + s.od, 0);
  const totalMakeup = subjects.reduce((a, s) => a + s.makeup, 0);
  const totalClasses = subjects.reduce((a, s) => a + s.totalClasses, 0);
  const overallPercentage =
    totalClasses > 0
      ? ((totalPresent + totalOD + totalMakeup) / totalClasses) * 100
      : 0;

  const lectures = subjects.filter((s) => s.type === "Lecture");
  const labs = subjects.filter((s) => s.type === "Lab");
  const atRisk = subjects.filter((s) => s.percentage < threshold);
  const safe = subjects.filter((s) => s.percentage >= threshold);

  const sorted = [...subjects].sort((a, b) => b.percentage - a.percentage);

  return {
    format,
    subjects,
    records,
    overall: {
      totalPresent,
      totalAbsent,
      totalOD,
      totalMakeup,
      totalClasses,
      overallPercentage,
    },
    lectures,
    labs,
    atRisk,
    safe,
    bestSubject: sorted[0] || null,
    worstSubject: sorted[sorted.length - 1] || null,
  };
}

// ─── Helpers ───────────────────────────────────────────────

export function classesNeeded(
  subject: SubjectAttendance,
  target: number = 75,
): number {
  if (subject.percentage >= target) return 0;
  const attended = subject.present + subject.od + subject.makeup;
  const total = subject.totalClasses;
  const needed = ((target / 100) * total - attended) / (1 - target / 100);
  return needed > 0 ? Math.ceil(needed) : 0;
}

export function classesCanMiss(
  subject: SubjectAttendance,
  target: number = 75,
): number {
  if (subject.percentage < target) return 0;
  const attended = subject.present + subject.od + subject.makeup;
  const total = subject.totalClasses;
  const canMiss = (attended * 100 - target * total) / target;
  return canMiss > 0 ? Math.floor(canMiss) : 0;
}
