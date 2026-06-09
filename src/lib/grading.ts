export type Curriculum = 'CBE' | '844';
export type SchoolLevelBand = 'primary' | 'junior' | 'senior' | '844';

export interface CompetencyGrade {
  subLevel: string;
  grade: 'EE' | 'ME' | 'AE' | 'BE';
  points: number;
  descriptor: string;
  band: SchoolLevelBand;
}

export interface NumericGrade844 {
  grade: string;
  points: number;
  descriptor: string;
  band: '844';
}

function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getSchoolLevelBand(classData?: { curriculum?: Curriculum | string | null; grade_level?: number | string | null; level?: number | string | null; name?: string | null }): SchoolLevelBand {
  const curriculum = String(classData?.curriculum || 'CBE').toUpperCase();
  if (curriculum === '844' || curriculum === '8-4-4') return '844';

  // Use grade_level first (new column), fall back to level (legacy)
  const rawLevel = classData?.grade_level ?? classData?.level;
  const parsedLevel = typeof rawLevel === 'number' ? rawLevel : parseInt(String(rawLevel || '').replace(/[^0-9]/g, ''), 10);

  // Primary School: Grades 1-6 — marks only, no points
  if (Number.isFinite(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 6) return 'primary';

  // Junior School: Grades 7-9 — 8-level scale with points
  if (Number.isFinite(parsedLevel) && parsedLevel >= 7 && parsedLevel <= 9) return 'junior';

  // Senior School: Grades 10-12 — same 8-level scale as Junior
  if (Number.isFinite(parsedLevel) && parsedLevel >= 10 && parsedLevel <= 12) return 'senior';

  // Fallback: parse from class name
  const name = String(classData?.name || '').toLowerCase();
  if (/senior|grade\s*1[012]|\b1[012]\b/.test(name)) return 'senior';
  if (/junior|jss|grade\s*[789]|\b[789]\b/.test(name)) return 'junior';
  return 'primary';
}

/**
 * PRIMARY SCHOOL (Grades 1-6): MARKS ONLY — NO points shown to users.
 * EE: 75-100%, ME: 41-74%, AE: 21-40%, BE: 1-20%
 *
 * JUNIOR SCHOOL (Grades 7-9): 8-level scale WITH points.
 * EE1=8, EE2=7, ME1=6, ME2=5, AE1=4, AE2=3, BE1=2, BE2=1
 *
 * SENIOR SCHOOL (Grades 10-12): Same 8-level scale as Junior WITH points.
 * EE1=8, EE2=7, ME1=6, ME2=5, AE1=4, AE2=3, BE1=2, BE2=1
 */
export function calculateCompetencyGrade(score: number, band: SchoolLevelBand = 'primary'): CompetencyGrade {
  const percentage = normalizePercentage(score);

  if (band === 'junior' || band === 'senior') {
    // Junior/Senior (Grades 7-12): 8-level scale with points
    if (percentage >= 90) return { subLevel: 'EE1', grade: 'EE', points: 8, descriptor: 'Exceeding Expectation', band };
    if (percentage >= 75) return { subLevel: 'EE2', grade: 'EE', points: 7, descriptor: 'Exceeding Expectation', band };
    if (percentage >= 58) return { subLevel: 'ME1', grade: 'ME', points: 6, descriptor: 'Meeting Expectation', band };
    if (percentage >= 41) return { subLevel: 'ME2', grade: 'ME', points: 5, descriptor: 'Meeting Expectation', band };
    if (percentage >= 31) return { subLevel: 'AE1', grade: 'AE', points: 4, descriptor: 'Approaching Expectation', band };
    if (percentage >= 21) return { subLevel: 'AE2', grade: 'AE', points: 3, descriptor: 'Approaching Expectation', band };
    if (percentage >= 11) return { subLevel: 'BE1', grade: 'BE', points: 2, descriptor: 'Below Expectation', band };
    return { subLevel: 'BE2', grade: 'BE', points: 1, descriptor: 'Below Expectation', band };
  }

  // Primary (Grades 1-6): MARKS ONLY — 4 competency descriptors, NO points shown.
  // EE: 75-100%, ME: 41-74%, AE: 21-40%, BE: 1-20%
  if (percentage >= 75) return { subLevel: 'EE', grade: 'EE', points: 0, descriptor: 'Exceeding Expectation', band };
  if (percentage >= 41) return { subLevel: 'ME', grade: 'ME', points: 0, descriptor: 'Meeting Expectation', band };
  if (percentage >= 21) return { subLevel: 'AE', grade: 'AE', points: 0, descriptor: 'Approaching Expectation', band };
  return { subLevel: 'BE', grade: 'BE', points: 0, descriptor: 'Below Expectation', band };
}

export function calculate844Grade(score: number): NumericGrade844 {
  const percentage = normalizePercentage(score);
  if (percentage >= 80) return { grade: 'A', points: 12, descriptor: 'Excellent', band: '844' };
  if (percentage >= 75) return { grade: 'A-', points: 11, descriptor: 'Very Good', band: '844' };
  if (percentage >= 70) return { grade: 'B+', points: 10, descriptor: 'Good', band: '844' };
  if (percentage >= 65) return { grade: 'B', points: 9, descriptor: 'Good', band: '844' };
  if (percentage >= 60) return { grade: 'B-', points: 8, descriptor: 'Good', band: '844' };
  if (percentage >= 55) return { grade: 'C+', points: 7, descriptor: 'Average', band: '844' };
  if (percentage >= 50) return { grade: 'C', points: 6, descriptor: 'Average', band: '844' };
  if (percentage >= 45) return { grade: 'C-', points: 5, descriptor: 'Average', band: '844' };
  if (percentage >= 40) return { grade: 'D+', points: 4, descriptor: 'Below Average', band: '844' };
  if (percentage >= 35) return { grade: 'D', points: 3, descriptor: 'Below Average', band: '844' };
  if (percentage >= 30) return { grade: 'D-', points: 2, descriptor: 'Below Average', band: '844' };
  return { grade: 'E', points: 1, descriptor: 'Poor', band: '844' };
}

export function calculateResultGrades(percentage: number, classData?: { curriculum?: Curriculum | string | null; level?: number | string | null; name?: string | null }) {
  const band = getSchoolLevelBand(classData);
  const cbcGrade = calculateCompetencyGrade(percentage, (band === '844') ? 'junior' : band);
  const grade844 = calculate844Grade(percentage);
  return { band, cbcGrade, grade844 };
}

export function gradeDisplayLabel(band: SchoolLevelBand): string {
  if (band === '844') return '8-4-4 Grade';
  if (band === 'senior') return 'Senior CBE Grade';
  if (band === 'junior') return 'Junior CBE Grade';
  return 'Primary CBE Grade';
}
