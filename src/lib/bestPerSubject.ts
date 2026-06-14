/**
 * bestPerSubject.ts
 * Helper to compute the best-performing student per subject from raw results.
 * Used across Teacher Dashboard, School Admin Results, Student Report Card,
 * and Parent Child Report Card.
 */

import { calculateCompetencyGrade, calculate844Grade, getSchoolLevelBand } from './grading';
import type { SchoolLevelBand } from './grading';

export interface BestInSubject {
  subjectName: string;
  studentId: string;
  studentName: string;
  percentage: number;
  gradeLabel: string;   // e.g. "EE1", "ME", "A"
  points: number | null; // null for Primary
}

/**
 * Given an array of raw result rows (each with students, subjects, percentage/marks/out_of),
 * and optional classData for band detection, returns the best student per subject.
 *
 * @param rawResults  Array of result records from Supabase
 * @param classData   Optional class object with curriculum/grade_level/level/name
 */
export function computeBestPerSubject(
  rawResults: any[],
  classData?: { curriculum?: string | null; grade_level?: number | string | null; level?: number | string | null; name?: string | null }
): BestInSubject[] {
  const band: SchoolLevelBand = getSchoolLevelBand(classData);
  const is844 = band === '844';
  const isPrimary = band === 'primary';

  // Group results by subject
  const bySubject: Record<string, any[]> = {};
  for (const r of rawResults) {
    const subName: string = r.subjects?.name || r.subject_name || 'Unknown';
    if (!bySubject[subName]) bySubject[subName] = [];
    bySubject[subName].push(r);
  }

  const best: BestInSubject[] = [];

  for (const [subjectName, rows] of Object.entries(bySubject)) {
    let topRow: any = null;
    let topPct = -1;

    for (const r of rows) {
      const pct: number =
        r.percentage !== undefined && r.percentage !== null
          ? Number(r.percentage)
          : r.out_of > 0
          ? (Number(r.marks || 0) / Number(r.out_of)) * 100
          : 0;

      if (pct > topPct) {
        topPct = pct;
        topRow = r;
      }
    }

    if (!topRow) continue;

    const studentName =
      topRow.students
        ? `${topRow.students.first_name || ''} ${topRow.students.last_name || ''}`.trim()
        : topRow.student_name || 'Unknown';

    let gradeLabel: string;
    let points: number | null;

    if (is844) {
      const g = calculate844Grade(topPct);
      gradeLabel = g.grade;
      points = g.points;
    } else {
      const g = calculateCompetencyGrade(topPct, isPrimary ? 'primary' : band);
      gradeLabel = g.subLevel;
      points = isPrimary ? null : g.points;
    }

    best.push({
      subjectName,
      studentId: topRow.students?.id || topRow.student_id || '',
      studentName,
      percentage: Math.round(topPct),
      gradeLabel,
      points,
    });
  }

  // Sort alphabetically by subject name for consistent display
  best.sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  return best;
}

/**
 * Returns the subjects in which a specific student is the best performer.
 *
 * @param studentId   The student's ID to check
 * @param bestList    Output of computeBestPerSubject()
 */
export function getStudentBestSubjects(studentId: string, bestList: BestInSubject[]): BestInSubject[] {
  return bestList.filter(b => b.studentId === studentId);
}
