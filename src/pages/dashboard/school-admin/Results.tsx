import { useState, useEffect } from 'react';
import { supabaseUntyped } from "@/lib/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { Search, Award, Download, FileText, Loader2, TrendingUp, TrendingDown, Minus, Send, Bell, Trophy } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

// ── Grade helpers ──────────────────────────────────────────────────────────────
import { calculateCompetencyGrade, getSchoolLevelBand, calculate844Grade } from '@/lib/grading';
import type { SchoolLevelBand } from '@/lib/grading';
import { computeBestPerSubject } from '@/lib/bestPerSubject';
import type { BestInSubject } from '@/lib/bestPerSubject';

function calculateCBEGrade(pct: number, classData?: { curriculum?: string | null; grade_level?: number | string | null; level?: number | string | null; name?: string | null }) {
  const band = getSchoolLevelBand(classData);
  const g = calculateCompetencyGrade(pct, band === '844' ? 'junior' : band);
  return { subLevel: g.subLevel, grade: g.grade, points: g.points };
}

/** Overall 4-letter grade for CBE (EE/ME/AE/BE) — used in class summary */
function overallGradeLabelCBC(avgPct: number): string {
  if (avgPct >= 75) return 'EE';
  if (avgPct >= 41) return 'ME';
  if (avgPct >= 21) return 'AE';
  return 'BE';
}

/** Get overall sublevel + points for CBC based on average percentage and band */
function overallGradeWithBand(avgPct: number, band: SchoolLevelBand) {
  const g = calculateCompetencyGrade(avgPct, band);
  return { subLevel: g.subLevel, grade: g.grade, points: g.points, descriptor: g.descriptor };
}

/** Get grade for 844 system */
function overallGrade844(avgPct: number) {
  return calculate844Grade(avgPct);
}

/** Generate personalized AI teacher comment based on student performance */
function generateAIComment(
  avgPct: number,
  deviation: number | null,
  bestSubject: string,
  weakestSubject: string,
  position: number,
  totalStudents: number,
  isNew: boolean,
  band?: SchoolLevelBand
): string {
  const grade = overallGradeWithBand(avgPct, band || 'junior');
  const gradeLabel = band === '844' ? overallGrade844(avgPct).grade : grade.subLevel;
  const descriptor = band === '844' ? overallGrade844(avgPct).descriptor : grade.descriptor;

  // Top performers
  if (position === 1 && totalStudents >= 3) {
    return `Exceptional performance! You ranked 1st out of ${totalStudents} students. Your mastery of ${bestSubject} is remarkable. With your ${gradeLabel} grade (${descriptor}), you are a role model. Continue aiming higher — the sky is not the limit!`;
  }
  if (position === 2 && totalStudents >= 3) {
    return `Outstanding work! You ranked 2nd out of ${totalStudents} students. Your strength in ${bestSubject} is impressive. Keep pushing to reach the top. Your ${gradeLabel} grade reflects excellence!`;
  }
  if (position === 3 && totalStudents >= 3) {
    return `Excellent effort! You ranked 3rd out of ${totalStudents} students. Your dedication to ${bestSubject} is paying off. With consistent effort, you can climb even higher!`;
  }
  if (position <= 5 && totalStudents >= 5) {
    return `Great work! You are among the top 5 performers in a class of ${totalStudents}. Your ${gradeLabel} grade in ${bestSubject} shows great potential. Keep up the good work!`;
  }

  // New student
  if (isNew || deviation === null) {
    return `Welcome! You have achieved a ${gradeLabel} grade overall (${descriptor}). Your performance in ${bestSubject} is commendable. Focus on improving ${weakestSubject} next term. Keep working hard — we believe in your potential!`;
  }

  // Deviation-based comments
  const dev = Math.abs(deviation);
  if (deviation > 10) {
    return `Remarkable improvement! You rose by ${dev.toFixed(1)}% from last term. Your hard work and determination in ${bestSubject} have truly paid off. This ${gradeLabel} grade is well deserved. Maintain this momentum!`;
  }
  if (deviation > 5) {
    return `Excellent progress! You improved by ${dev.toFixed(1)}% from last term. Your dedication to ${bestSubject} is evident. To reach even greater heights, please give more attention to ${weakestSubject}. Keep soaring!`;
  }
  if (deviation > 2) {
    return `Good improvement! You rose by ${dev.toFixed(1)}% from last term. Your ${gradeLabel} grade shows positive growth. Continue building on your strength in ${bestSubject} while working on ${weakestSubject}.`;
  }
  if (deviation >= -1) {
    return `Consistent performance this term with a ${gradeLabel} grade (${descriptor}). You are strong in ${bestSubject}. Let's set goals to improve ${weakestSubject} next term. steady progress leads to success!`;
  }
  if (deviation >= -5) {
    return `Your performance dropped by ${dev.toFixed(1)}% from last term. Don't be discouraged — every great achiever faces setbacks. Focus more on ${weakestSubject} and seek help from your teacher. We believe you will bounce back!`;
  }
  if (deviation >= -10) {
    return `Your performance dropped by ${dev.toFixed(1)}% from last term. This is a concern. Please dedicate more time to ${weakestSubject} and revise your study habits. Your teachers and parents are here to support you.`;
  }
  return `Your performance dropped significantly by ${dev.toFixed(1)}% from last term. Urgent attention is needed, especially in ${weakestSubject}. Please meet with your class teacher to create an improvement plan. We believe in your ability to recover!`;
}

const SUBJECT_SHORT: Record<string, string> = {
  'English': 'ENG',
  'Kiswahili': 'KISW',
  'Mathematics': 'MATH',
  'Integrated Science': 'INTSCI',
  'Social Studies': 'SST',
  'Creative Arts & Sports': 'CAS',
  'Pre-Technical Studies': 'PRE-TECH',
  'Christian Religious Education': 'CRE',
  'Agriculture': 'AGRI',
};
function shortName(name: string) {
  return SUBJECT_SHORT[name] || name.substring(0, 7).toUpperCase();
}

export default function SchoolAdminResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [generatingBulk, setGeneratingBulk] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [schoolName, setSchoolName] = useState('School');
  const [bestPerSubjectList, setBestPerSubjectList] = useState<BestInSubject[]>([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const schoolId = user?.schoolId ?? '';
    const [{ data: r }, { data: c }, { data: t }, { data: sch }] = await Promise.all([
      supabaseUntyped.from('results')
        .select('*, students(first_name, last_name, admission_number), subjects(name)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false }),
      supabaseUntyped.from('classes').select('*').eq('school_id', schoolId).order('level'),
      supabaseUntyped.from('terms').select('*').eq('school_id', schoolId).order('academic_year', { ascending: false }),
      supabaseUntyped.from('schools').select('name').eq('id', schoolId).maybeSingle(),
    ]);
    setResults(r || []);
    setClasses(c || []);
    setTerms(t || []);
    if (sch?.name) setSchoolName(sch.name);
    setLoading(false);
  };

  const filtered = results.filter(r =>
    r.students?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.students?.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.subjects?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const gradeColor = (grade: string) => {
    if (grade?.startsWith('EE')) return 'bg-green-100 text-green-700';
    if (grade?.startsWith('ME')) return 'bg-blue-100 text-blue-700';
    if (grade?.startsWith('AE')) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const publishResults = async () => {
    if (!selectedClass || !selectedTerm) {
      toast.error('Please select a class and term first');
      return;
    }
    setPublishing(true);
    try {
      const { error: updateError } = await supabaseUntyped
        .from('results')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('class_id', selectedClass)
        .eq('term_id', selectedTerm)
        .eq('school_id', user?.schoolId);
      if (updateError) throw updateError;
      const { data: classStudents } = await supabaseUntyped
        .from('students')
        .select('id, profile_id, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('is_active', true);
      if (!classStudents) throw new Error('Failed to fetch students');
      const studentIds = classStudents.map(s => s.id);
      // Use correct table: parent_student_links (not student_parents)
      const { data: parentRelations } = await supabaseUntyped
        .from('parent_student_links')
        .select('parent_id')
        .in('student_id', studentIds);
      const parentIds = parentRelations?.map((r: any) => r.parent_id) || [];
      const allUserIds = [
        ...classStudents.map((s: any) => s.profile_id).filter(Boolean),
        ...parentIds,
      ];
      const termData = terms.find(t => t.id === selectedTerm);
      const classData = classes.find(c => c.id === selectedClass);
      const notifTitle = 'Results Published';
      const notifMessage = `Results for ${classData?.name} - ${termData?.name} ${termData?.academic_year} have been published. Check your report card now!`;
      // Use correct column: is_read (not read)
      const notifications = allUserIds.map(userId => ({
        user_id: userId,
        school_id: user?.schoolId,
        title: notifTitle,
        message: notifMessage,
        type: 'results_published',
        is_read: false,
        action_url: '/student/results',
        created_at: new Date().toISOString(),
      }));
      if (notifications.length > 0) {
        const { error: notifError } = await supabaseUntyped
          .from('notifications')
          .insert(notifications);
        if (notifError) console.warn('Notification insert warning:', notifError);
      }
      // Send web push notifications via edge function
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://naihzzlszvrkxrxogsuz.supabase.co';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            userIds: allUserIds,
            title: notifTitle,
            message: notifMessage,
          }),
        });
      } catch (pushErr) {
        console.warn('Push notification delivery warning:', pushErr);
      }
      toast.success(`Results published! ${allUserIds.length} users notified.`);
      fetchAll();
    } catch (err: any) {
      toast.error('Failed to publish results: ' + err.message);
      console.error(err);
    }
    setPublishing(false);
  };

  // Recompute best-per-subject whenever class+term selection changes
  useEffect(() => {
    if (selectedClass && selectedTerm) {
      fetchAndComputeBestPerSubject();
    } else {
      setBestPerSubjectList([]);
    }
  }, [selectedClass, selectedTerm]);

  const fetchAndComputeBestPerSubject = async () => {
    const classObj = classes.find(c => c.id === selectedClass);
    const { data } = await supabaseUntyped
      .from('results')
      .select('*, students(id, first_name, last_name), subjects(name)')
      .eq('class_id', selectedClass)
      .eq('term_id', selectedTerm)
      .eq('school_id', user?.schoolId);
    if (data && data.length > 0) {
      setBestPerSubjectList(computeBestPerSubject(data, classObj));
    } else {
      setBestPerSubjectList([]);
    }
  };

  const fetchClassResults = async () => {
    if (!selectedClass || !selectedTerm) {
      toast.error('Please select a class and term first');
      return null;
    }
    const { data, error } = await supabaseUntyped
      .from('results')
      .select('*, students(id, first_name, last_name, admission_number), subjects(name)')
      .eq('class_id', selectedClass)
      .eq('term_id', selectedTerm)
      .eq('school_id', user?.schoolId);
    if (error) { toast.error('Failed to fetch results: ' + error.message); return null; }
    return data || [];
  };

  const fetchPreviousTermAvg = async (studentId: string, currentTermId: string) => {
    const currentTermObj = terms.find(t => t.id === currentTermId);
    if (!currentTermObj) return null;
    const sortedTerms = [...terms].sort((a, b) => {
      if (a.academic_year !== b.academic_year) return Number(a.academic_year) - Number(b.academic_year);
      const termNum = (n: string) => n.includes('1') ? 1 : n.includes('2') ? 2 : 3;
      return termNum(a.name) - termNum(b.name);
    });
    const currentIdx = sortedTerms.findIndex(t => t.id === currentTermId);
    if (currentIdx <= 0) return null;
    const prevTerm = sortedTerms[currentIdx - 1];
    const { data } = await supabaseUntyped
      .from('results')
      .select('marks, out_of, percentage')
      .eq('student_id', studentId)
      .eq('term_id', prevTerm.id);
    if (!data || data.length === 0) return null;
    const totalPct = data.reduce((s: number, r: any) => s + (r.percentage || (r.out_of > 0 ? (r.marks / r.out_of) * 100 : 0)), 0);
    return totalPct / data.length;
  };

  const buildStudentSummary = (rawResults: any[], classData?: any) => {
    const band = getSchoolLevelBand(classData);
    const byStudent: Record<string, any> = {};
    rawResults.forEach((r: any) => {
      const sid = r.students?.id || r.student_id;
      if (!byStudent[sid]) {
        byStudent[sid] = { student: r.students, subjects: {}, totalPct: 0, totalPoints: 0, count: 0 };
      }
      const pct = r.percentage !== undefined && r.percentage !== null ? Number(r.percentage) : (r.out_of > 0 ? (r.marks / r.out_of) * 100 : 0);
      const subName = r.subjects?.name || 'Unknown';
      byStudent[sid].subjects[subName] = pct;
      byStudent[sid].subjects[subName + '_grade'] = band === '844' ? (r.grade_844 || '') : (r.cbc_sublevel || '');
      byStudent[sid].subjects[subName + '_points'] = band === '844' ? (r.points_844 || 0) : (r.cbc_points || 0);
      byStudent[sid].totalPct += pct;
      byStudent[sid].totalPoints += band === '844' ? (r.points_844 || 0) : (r.cbc_points || 0);
      byStudent[sid].count += 1;
    });
    const summaries = Object.entries(byStudent).map(([sid, v]: [string, any]) => ({
      studentId: sid,
      student: v.student,
      subjects: v.subjects,
      avgPct: v.count > 0 ? v.totalPct / v.count : 0,
      totalPct: v.totalPct,
      totalPoints: v.totalPoints,
      subjectCount: v.count,
      position: 0,
    }));
    // Rank by TOTAL MARKS (totalPct), then by totalPoints as tiebreaker for Junior/844
    summaries.sort((a, b) => {
      if (b.totalPct !== a.totalPct) return b.totalPct - a.totalPct;
      return b.totalPoints - a.totalPoints;
    });
    summaries.forEach((s, i) => { s.position = i + 1; });
    return summaries;
  };

  // ── Helper: draw horizontal bar for grade distribution ──────────────────────
  const drawBar = (doc: jsPDF, x: number, y: number, width: number, filledPct: number, color: [number, number, number]) => {
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(240, 240, 240);
    doc.rect(x, y, width, 5, 'FD');
    if (filledPct > 0) {
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(x, y, width * filledPct, 5, 'F');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // FEATURE: Complete 5-Section Class Results PDF
  // ═══════════════════════════════════════════════════════════════════════════════
  const downloadClassResultsPDF = async () => {
    if (!selectedClass || !selectedTerm) { toast.error('Please select a class and term'); return; }
    setGeneratingPDF(true);
    try {
      const rawResults = await fetchClassResults();
      if (!rawResults || rawResults.length === 0) {
        toast.error('No results found for this class and term');
        setGeneratingPDF(false);
        return;
      }
      const classObj = classes.find(c => c.id === selectedClass);
      const termObj = terms.find(t => t.id === selectedTerm);
      const band = getSchoolLevelBand(classObj);
      const isPrimary = band === 'primary';
      const is844 = band === '844';
      const maxPossible = is844 ? 12 : (isPrimary ? 0 : 8); // max points per subject

      const summaries = buildStudentSummary(rawResults, classObj);
      const allSubjects = Array.from(new Set(rawResults.map((r: any) => r.subjects?.name).filter(Boolean))) as string[];
      const totalStudents = summaries.length;

      // ── Missing variable calculations (fixes "classMean is not defined" error) ──
      const classMean = totalStudents > 0
        ? summaries.reduce((sum, s) => sum + s.avgPct, 0) / totalStudents
        : 0;

      // Subject performance calculation
      const subjectTotals: Record<string, { total: number; count: number }> = {};
      summaries.forEach(s => {
        Object.entries(s.subjects).forEach(([subject, marks]) => {
          if (subject.endsWith('_grade') || subject.endsWith('_points')) return;
          if (!subjectTotals[subject]) subjectTotals[subject] = { total: 0, count: 0 };
          subjectTotals[subject].total += marks as number;
          subjectTotals[subject].count++;
        });
      });
      // Fetch previous term averages for deviation analysis
      const prevAvgMap: Record<string, number | null> = {};
      for (const s of summaries) {
        prevAvgMap[s.studentId] = await fetchPreviousTermAvg(s.studentId, selectedTerm);
      }

      // Students needing attention (dropped >10% from previous term)
      const needAttention = summaries.filter(s => {
        const prevAvg = prevAvgMap[s.studentId];
        return prevAvg !== null && prevAvg !== undefined && (s.avgPct - prevAvg) < -10;
      });

      // Subject-level analysis
      const subjectStats = allSubjects.map(sub => {
        const vals = summaries.map(s => s.subjects[sub]).filter(v => v !== undefined);
        const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        const grade = is844 ? overallGrade844(mean) : overallGradeWithBand(mean, band);
        return { name: sub, mean, grade, vals };
      });
      subjectStats.sort((a, b) => b.mean - a.mean);

      // Previous term subject stats for improvement analysis
      const prevTerm = getPreviousTerm(selectedTerm);
      let prevSubjectStats: Record<string, number> = {};
      if (prevTerm) {
        const { data: prevResults } = await supabaseUntyped
          .from('results')
          .select('*, subjects(name)')
          .eq('class_id', selectedClass)
          .eq('term_id', prevTerm.id)
          .eq('school_id', user?.schoolId);
        if (prevResults) {
          allSubjects.forEach(sub => {
            const subResults = (prevResults as any[]).filter((r: any) => r.subjects?.name === sub);
            const pcts = subResults.map((r: any) => r.percentage !== undefined ? Number(r.percentage) : (r.out_of > 0 ? (r.marks / r.out_of) * 100 : 0));
            if (pcts.length > 0) prevSubjectStats[sub] = pcts.reduce((a, b) => a + b, 0) / pcts.length;
          });
        }
      }

      // Subject improvement data
      const subjectImprovement = subjectStats.map(s => {
        const prev = prevSubjectStats[s.name];
        const change = prev !== undefined ? s.mean - prev : null;
        return { ...s, prevMean: prev, change };
      });
      const mostImprovedSubjects = subjectImprovement.filter(s => s.change !== null && s.change > 0).sort((a, b) => (b.change || 0) - (a.change || 0));
      const weakestSubjects = subjectImprovement.filter(s => s.change !== null && s.change < 0).sort((a, b) => (a.change || 0) - (b.change || 0));

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      // Compute best per subject for the whole class (used in Sections 1 and 4)
      const bestPerSubjectData = computeBestPerSubject(rawResults, classObj);

      // ── SECTION 1: CLASS SUMMARY PAGE ───────────────────────────────────────
      {
        // Blue header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 35, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, 105, 13, { align: 'center' });
        doc.setFontSize(11);
        doc.text('CLASS RESULTS SUMMARY', 105, 22, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`${classObj?.name || 'Class'} — ${termObj?.name || 'Term'} ${termObj?.academic_year || ''}`, 105, 30, { align: 'center' });

        // Class statistics box
        const classGrade = is844 ? overallGrade844(classMean) : overallGradeWithBand(classMean, band);
        const statsY = 42;

        doc.setFillColor(245, 247, 255);
        doc.rect(14, statsY, 182, 30, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Students: ${totalStudents}`, 20, statsY + 8);
        doc.text(`Class Average: ${classMean.toFixed(1)}%`, 75, statsY + 8);
        doc.text(`Class Mean Grade: ${is844 ? classGrade.grade : classGrade.subLevel}${!isPrimary ? ` (${(classGrade as any).points} ${is844 ? 'pts' : 'points'})` : ''}`, 130, statsY + 8);
        doc.text(`Grading System: ${is844 ? '8-4-4' : isPrimary ? 'Primary CBE (Marks Only)' : 'Junior CBE (With Points)'}`, 20, statsY + 18);
        doc.text(`Subjects: ${allSubjects.length}`, 130, statsY + 18);

        // Grade Distribution Chart
        const gradeDistY = statsY + 38;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('GRADE DISTRIBUTION', 14, gradeDistY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        if (is844) {
          // 8-4-4 grade distribution (A, A-, B+, B, B-, C+, C, C-, D+, D, D-, E)
          const grades844 = [
            { label: 'A (12pts)', min: 80, color: [22, 163, 74] },
            { label: 'A- (11pts)', min: 75, color: [34, 197, 94] },
            { label: 'B+ (10pts)', min: 70, color: [56, 189, 114] },
            { label: 'B (9pts)', min: 65, color: [74, 222, 128] },
            { label: 'B- (8pts)', min: 60, color: [96, 220, 140] },
            { label: 'C+ (7pts)', min: 55, color: [250, 204, 21] },
            { label: 'C (6pts)', min: 50, color: [253, 224, 71] },
            { label: 'C- (5pts)', min: 45, color: [253, 186, 116] },
            { label: 'D+ (4pts)', min: 40, color: [253, 164, 100] },
            { label: 'D (3pts)', min: 35, color: [251, 146, 60] },
            { label: 'D- (2pts)', min: 30, color: [249, 115, 22] },
            { label: 'E (1pt)', min: 0, color: [220, 38, 38] },
          ];
          let row = 0;
          for (const g of grades844) {
            const count = summaries.filter(s => {
              const gr = overallGrade844(s.avgPct);
              return gr.grade === g.label.split(' ')[0];
            }).length;
            const pct = totalStudents > 0 ? count / totalStudents : 0;
            const y = gradeDistY + 10 + row * 8;
            doc.text(`${g.label}: ${count} student${count !== 1 ? 's' : ''} (${(pct * 100).toFixed(1)}%)`, 20, y);
            drawBar(doc, 90, y - 3, 80, pct, g.color as [number, number, number]);
            row++;
          }
        } else if (isPrimary) {
          // Primary: EE, ME, AE, BE (no points)
          const gradesP = [
            { label: 'EE (Exceeding)', min: 75, color: [22, 163, 74] },
            { label: 'ME (Meeting)', min: 41, color: [37, 99, 235] },
            { label: 'AE (Approaching)', min: 21, color: [249, 115, 22] },
            { label: 'BE (Below)', min: 0, color: [220, 38, 38] },
          ];
          let row = 0;
          for (const g of gradesP) {
            const count = summaries.filter(s => {
              const p = s.avgPct;
              if (g.label.startsWith('EE')) return p >= 75;
              if (g.label.startsWith('ME')) return p >= 41 && p < 75;
              if (g.label.startsWith('AE')) return p >= 21 && p < 41;
              return p < 21;
            }).length;
            const pct = totalStudents > 0 ? count / totalStudents : 0;
            const y = gradeDistY + 10 + row * 10;
            doc.text(`${g.label}: ${count} student${count !== 1 ? 's' : ''} (${(pct * 100).toFixed(1)}%)`, 20, y);
            drawBar(doc, 90, y - 3, 80, pct, g.color as [number, number, number]);
            row++;
          }
        } else {
          // Junior: EE1-EE2-ME1-ME2-AE1-AE2-BE1-BE2
          const gradesJ = [
            { label: 'EE1 (8pts)', min: 90, color: [22, 163, 74] },
            { label: 'EE2 (7pts)', min: 75, color: [34, 197, 94] },
            { label: 'ME1 (6pts)', min: 58, color: [37, 99, 235] },
            { label: 'ME2 (5pts)', min: 41, color: [96, 165, 250] },
            { label: 'AE1 (4pts)', min: 31, color: [250, 204, 21] },
            { label: 'AE2 (3pts)', min: 21, color: [253, 186, 116] },
            { label: 'BE1 (2pts)', min: 11, color: [251, 146, 60] },
            { label: 'BE2 (1pt)', min: 0, color: [220, 38, 38] },
          ];
          let row = 0;
          for (const g of gradesJ) {
            const count = summaries.filter(s => {
              const gr = overallGradeWithBand(s.avgPct, 'junior');
              return gr.subLevel === g.label.split(' ')[0];
            }).length;
            const pct = totalStudents > 0 ? count / totalStudents : 0;
            const y = gradeDistY + 10 + row * 8;
            doc.text(`${g.label}: ${count} student${count !== 1 ? 's' : ''} (${(pct * 100).toFixed(1)}%)`, 20, y);
            drawBar(doc, 90, y - 3, 80, pct, g.color as [number, number, number]);
            row++;
          }
        }

        // Top 5 Performers
        const top5Y = gradeDistY + (is844 ? 108 : isPrimary ? 52 : 72);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('TOP 5 PERFORMERS', 14, top5Y);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const top5 = summaries.slice(0, 5);
        top5.forEach((s: any, i: number) => {
          const gr = is844 ? overallGrade844(s.avgPct) : overallGradeWithBand(s.avgPct, band);
          doc.text(`${i + 1}. ${s.student?.first_name} ${s.student?.last_name} — ${s.avgPct.toFixed(1)}% — ${is844 ? gr.grade : gr.subLevel}${!isPrimary ? ` (${(gr as any).points}pts)` : ''}`, 20, top5Y + 7 + i * 6);
        });

        // Most Improved Students
        const improved = summaries
          .filter(s => prevAvgMap[s.studentId] !== null && prevAvgMap[s.studentId] !== undefined)
          .map(s => ({ ...s, dev: s.avgPct - (prevAvgMap[s.studentId] as number) }))
          .sort((a: any, b: any) => b.dev - a.dev)
          .slice(0, 3);
        const improvedY = top5Y + 42;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('MOST IMPROVED STUDENTS', 14, improvedY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        if (improved.length > 0) {
          improved.forEach((s: any, i: number) => {
            doc.text(`${i + 1}. ${s.student?.first_name} ${s.student?.last_name}: Improved by +${s.dev.toFixed(1)}%`, 20, improvedY + 7 + i * 6);
          });
        } else {
          doc.text('No previous term data available for comparison.', 20, improvedY + 7);
        }

        // Students Needing Attention (dropped >10%)
        const attentionY = improvedY + 30;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(220, 38, 38);
        doc.text('STUDENTS NEEDING ATTENTION (>10% drop)', 14, attentionY);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const needAttentionWithDev = needAttention.map(s => ({
          ...s,
          dev: s.avgPct - (prevAvgMap[s.studentId] as number)
        })).sort((a: any, b: any) => a.dev - b.dev);
        if (needAttentionWithDev.length > 0) {
          needAttentionWithDev.forEach((s: any, i: number) => {
            doc.text(`${i + 1}. ${s.student?.first_name} ${s.student?.last_name}: Dropped by ${s.dev.toFixed(1)}%`, 20, attentionY + 7 + i * 6);
          });
        } else {
          doc.text('No students dropped by more than 10%. Great job class!', 20, attentionY + 7);
        }

        // Best Student Per Subject
        const bestSubjY = attentionY + (needAttentionWithDev.length > 0 ? needAttentionWithDev.length * 6 + 14 : 14);
        if (bestPerSubjectData.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(202, 138, 4);
          doc.text('BEST STUDENT PER SUBJECT', 14, bestSubjY);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          bestPerSubjectData.forEach((b, i) => {
            const pts = b.points !== null ? ` (${b.points} pts)` : '';
            doc.text(`🏆 Best in ${b.subjectName}: ${b.studentName} — ${b.percentage}% — ${b.gradeLabel}${pts}`, 20, bestSubjY + 8 + i * 6);
          });
        }

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by CBE-Analytics School Management System', 105, 290, { align: 'center' });
      }

      // ── SECTION 2: SUBJECT PERFORMANCE ANALYSIS ─────────────────────────────
      doc.addPage();
      {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, 105, 8, { align: 'center' });
        doc.setFontSize(10);
        doc.text('SUBJECT PERFORMANCE ANALYSIS', 105, 16, { align: 'center' });

        const subRows = subjectStats.map((s, i) => {
          const gr = is844 ? s.grade.grade : (s.grade as any).subLevel;
          let status = '→ AVERAGE';
          if (i === 0) status = '↑ STRONG';
          else if (i === 1 && subjectStats.length > 3) status = '↑ GOOD';
          else if (i >= subjectStats.length - 2) status = '↓ NEEDS WORK';
          if (i === subjectStats.length - 1) status = '↓ WEAK';
          return [String(i + 1), s.name, `${s.mean.toFixed(1)}%`, gr, status];
        });

        autoTable(doc, {
          startY: 26,
          head: [['Rank', 'Subject', 'Average', 'Grade', 'Status']],
          body: subRows,
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 9, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 255] },
        });

        const afterY = (doc as any).lastAutoTable.finalY + 12;

        // Most Improved Subjects
        if (mostImprovedSubjects.length > 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(22, 163, 74);
          doc.text('MOST IMPROVED SUBJECTS (vs previous term):', 14, afterY);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          mostImprovedSubjects.slice(0, 3).forEach((s, i) => {
            doc.text(`↑ ${s.name}: +${(s.change || 0).toFixed(1)}%`, 20, afterY + 8 + i * 6);
          });
        }

        // Subjects Needing Attention
        if (weakestSubjects.length > 0) {
          const weakY = afterY + (mostImprovedSubjects.length > 0 ? 30 : 5);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text('SUBJECTS NEEDING ATTENTION:', 14, weakY);
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          weakestSubjects.slice(0, 3).forEach((s, i) => {
            doc.text(`↓ ${s.name}: ${(s.change || 0).toFixed(1)}%`, 20, weakY + 8 + i * 6);
          });
        }

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by CBE-Analytics School Management System', 105, 290, { align: 'center' });
      }

      // ── SECTION 3: STUDENT RESULTS TABLE ────────────────────────────────────
      doc.addPage();
      {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, 105, 8, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`STUDENT RESULTS TABLE — ${classObj?.name || ''} — ${termObj?.name || ''} ${termObj?.academic_year || ''}`, 105, 16, { align: 'center' });

        const subjectShorts = allSubjects.map(s => shortName(s));
        // Build headers based on school level
        let tableHeaders: string[];
        if (isPrimary) {
          tableHeaders = ['POS', 'Student', ...subjectShorts, 'Total', 'Avg%', 'Grade'];
        } else {
          tableHeaders = ['POS', 'Student', ...subjectShorts, 'Total', 'Pts', 'Grade'];
        }

        const tableRows = summaries.map((s: any) => {
          const gr = is844 ? overallGrade844(s.avgPct) : overallGradeWithBand(s.avgPct, band);
          const subjectCells = allSubjects.map(sub => {
            const pct = s.subjects[sub];
            if (pct === undefined) return '-';
            const subGrade = is844 ? overallGrade844(pct) : overallGradeWithBand(pct, band);
            if (isPrimary) return `${pct.toFixed(0)}% ${(subGrade as any).grade || (subGrade as any).subLevel}`;
            return `${pct.toFixed(0)}% ${(subGrade as any).subLevel || (subGrade as any).grade}`;
          });
          if (isPrimary) {
            return [
              `${s.position}${s.position === 1 ? 'st' : s.position === 2 ? 'nd' : s.position === 3 ? 'rd' : 'th'}`,
              `${s.student?.first_name || ''} ${s.student?.last_name || ''}`,
              ...subjectCells,
              `${s.totalPct.toFixed(0)}/${allSubjects.length * 100}`,
              `${s.avgPct.toFixed(1)}%`,
              (gr as any).grade || (gr as any).subLevel,
            ];
          } else {
            return [
              `${s.position}${s.position === 1 ? 'st' : s.position === 2 ? 'nd' : s.position === 3 ? 'rd' : 'th'}`,
              `${s.student?.first_name || ''} ${s.student?.last_name || ''}`,
              ...subjectCells,
              `${s.totalPct.toFixed(0)}/${allSubjects.length * 100}`,
              String(s.totalPoints),
              (gr as any).subLevel || (gr as any).grade,
            ];
          }
        });

        // Subject mean row
        const subjectMeans = allSubjects.map(sub => {
          const vals = summaries.map(s => s.subjects[sub]).filter(v => v !== undefined);
          return vals.length ? `${(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}%` : '-';
        });
        if (isPrimary) {
          tableRows.push(['', 'SUBJECT MEAN', ...subjectMeans, '', `${classMean.toFixed(1)}%`, overallGradeWithBand(classMean, band).grade]);
        } else {
          tableRows.push(['', 'SUBJECT MEAN', ...subjectMeans, '', '', is844 ? overallGrade844(classMean).grade : overallGradeWithBand(classMean, band).subLevel]);
        }

        autoTable(doc, {
          startY: 24,
          head: [tableHeaders],
          body: tableRows,
          styles: { fontSize: 6.5, cellPadding: 1 },
          headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 6.5, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 247, 255] },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.row.index === tableRows.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [230, 240, 255];
            }
          },
        });

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Ranking by Total Marks. ${isPrimary ? 'No points — marks only.' : 'Points shown for Junior CBE grading.'} | Generated by CBE-Analytics`, 105, 290, { align: 'center' });
      }

      // ── SECTION 4: INDIVIDUAL STUDENT REPORT PAGES ──────────────────────────
      for (const s of summaries) {
        doc.addPage();
        const prevAvg = prevAvgMap[s.studentId];
        const deviation = prevAvg !== null && prevAvg !== undefined ? s.avgPct - prevAvg : null;
        const isNew = deviation === null;

        const subjectEntries = Object.entries(s.subjects).filter(([k]) => !k.endsWith('_grade') && !k.endsWith('_points')) as [string, number][];
        const sortedBest = [...subjectEntries].sort((a, b) => b[1] - a[1]);
        const bestSubject = sortedBest[0]?.[0] || 'all subjects';
        const weakestSubject = sortedBest[sortedBest.length - 1]?.[0] || 'some subjects';

        const aiComment = generateAIComment(s.avgPct, deviation, bestSubject, weakestSubject, s.position, totalStudents, isNew, band);

        // Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, 105, 11, { align: 'center' });
        doc.setFontSize(11);
        doc.text('STUDENT REPORT CARD', 105, 20, { align: 'center' });

        // Student Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const y = 38;
        doc.text(`Student: ${s.student?.first_name || ''} ${s.student?.last_name || ''}`, 14, y);
        doc.text(`Adm No: ${s.student?.admission_number || 'N/A'}`, 14, y + 7);
        doc.text(`Class: ${classObj?.name || 'N/A'}`, 14, y + 14);
        doc.text(`Term: ${termObj?.name || ''} ${termObj?.academic_year || ''}`, 120, y);
        doc.text(`Position: ${s.position}${s.position === 1 ? 'st' : s.position === 2 ? 'nd' : s.position === 3 ? 'rd' : 'th'} out of ${totalStudents}`, 120, y + 7);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, y + 14);

        doc.setDrawColor(37, 99, 235);
        doc.line(14, y + 20, 196, y + 20);

        // Subject rows — different columns for Primary vs Junior vs 844
        const subjectRows = subjectEntries.map(([subName, pct]) => {
          let gradeLabel: string;
          let pointsVal: string;
          let descriptor: string;
          if (is844) {
            const g = overallGrade844(pct);
            gradeLabel = g.grade;
            pointsVal = String(g.points);
            descriptor = g.descriptor;
          } else {
            const g = overallGradeWithBand(pct, band);
            gradeLabel = g.subLevel;
            pointsVal = isPrimary ? '—' : String(g.points);
            descriptor = g.descriptor;
          }
          return isPrimary
            ? [subName, `${pct.toFixed(0)}%`, gradeLabel, descriptor]
            : [subName, `${pct.toFixed(0)}%`, gradeLabel, pointsVal, descriptor];
        });

        autoTable(doc, {
          startY: y + 25,
          head: [isPrimary
            ? ['Subject', 'Percentage', is844 ? '8-4-4 Grade' : 'CBE Grade', 'Descriptor']
            : ['Subject', 'Percentage', is844 ? '8-4-4 Grade' : 'CBE Grade', 'Points', 'Descriptor']
          ],
          body: subjectRows,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 247, 255] },
        });

        const tableEnd = (doc as any).lastAutoTable.finalY + 8;

        // Summary box
        doc.setFillColor(245, 247, 255);
        doc.rect(14, tableEnd, 182, 22, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const gr = is844 ? overallGrade844(s.avgPct) : overallGradeWithBand(s.avgPct, band);
        doc.text(`Average: ${s.avgPct.toFixed(1)}%`, 20, tableEnd + 8);
        doc.text(`Grade: ${is844 ? (gr as any).grade : (gr as any).subLevel}`, 70, tableEnd + 8);
        doc.text(`Position: ${s.position}/${totalStudents}`, 120, tableEnd + 8);
        if (!isPrimary) {
          doc.text(`Total Points: ${s.totalPoints}`, 160, tableEnd + 8);
        }
        doc.text(`Total Marks: ${s.totalPct.toFixed(0)}/${allSubjects.length * 100}`, 20, tableEnd + 17);
        if (!isPrimary) {
          doc.text(`Overall: ${is844 ? (gr as any).descriptor : (gr as any).descriptor}`, 70, tableEnd + 17);
        }

        // Deviation
        let devText = 'First Term — No previous data';
        if (deviation !== null) {
          const arrow = deviation >= 0 ? '\u25B2' : '\u25BC';
          const sign = deviation >= 0 ? '+' : '';
          devText = `${arrow} ${sign}${deviation.toFixed(1)}% vs previous term`;
        }
        doc.setFont('helvetica', 'normal');
        if (deviation !== null && deviation >= 0) doc.setTextColor(22, 163, 74);
        else if (deviation !== null && deviation < 0) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(100, 100, 100);
        doc.text(devText, 120, tableEnd + 17);
        doc.setTextColor(0, 0, 0);

        // Best in Subject Achievement for this student
        const studentBestSubjects = bestPerSubjectData.filter(b => b.studentId === (s.student?.id || s.studentId));
        let achievementY = tableEnd + 28;
        if (studentBestSubjects.length > 0) {
          doc.setFillColor(254, 249, 195);
          doc.rect(14, achievementY, 182, 6 + studentBestSubjects.length * 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(202, 138, 4);
          doc.text('ACHIEVEMENT:', 18, achievementY + 5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          studentBestSubjects.forEach((b, bi) => {
            const pts = b.points !== null ? ` (${b.points} pts)` : '';
            doc.text(`🏆 Best in ${b.subjectName}: ${b.percentage}% — ${b.gradeLabel}${pts}`, 18, achievementY + 11 + bi * 6);
          });
          achievementY += 6 + studentBestSubjects.length * 6 + 4;
        }

        // AI Comment
        const commentY = achievementY + 2;
        doc.setFillColor(254, 252, 232);
        doc.rect(14, commentY, 182, 30, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Class Teacher\'s Comment:', 18, commentY + 7);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const commentLines = doc.splitTextToSize(aiComment, 170);
        doc.text(commentLines, 18, commentY + 14);

        // Signatures
        const sigY = commentY + 40;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('Class Teacher Signature: ___________________________', 14, sigY);
        doc.text('Principal Signature: ___________________________', 120, sigY);
        doc.text('Date: ___________________', 14, sigY + 10);
        doc.text('School Stamp:', 120, sigY + 10);

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Student Report | ${s.student?.first_name} ${s.student?.last_name} | Generated by CBE-Analytics`, 105, 290, { align: 'center' });
      }

      // ── SECTION 5: PERFORMANCE TRENDS ───────────────────────────────────────
      doc.addPage();
      {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, 105, 8, { align: 'center' });
        doc.setFontSize(10);
        doc.text('PERFORMANCE TRENDS & ANALYSIS', 105, 16, { align: 'center' });

        const trendY = 28;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('CLASS PERFORMANCE SUMMARY', 14, trendY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Class Average: ${classMean.toFixed(1)}%`, 14, trendY + 10);
        doc.text(`Class Grade: ${is844 ? overallGrade844(classMean).grade : overallGradeWithBand(classMean, band).subLevel}`, 75, trendY + 10);
        doc.text(`Students Above Average: ${summaries.filter(s => s.avgPct >= classMean).length} of ${totalStudents}`, 130, trendY + 10);

        // Top performer vs class average
        const topPerformer = summaries[0];
        if (topPerformer) {
          doc.text(`Best Performer: ${topPerformer.student?.first_name} ${topPerformer.student?.last_name} (${topPerformer.avgPct.toFixed(1)}%)`, 14, trendY + 20);
          doc.text(`Gap from Class Avg: +${(topPerformer.avgPct - classMean).toFixed(1)}%`, 130, trendY + 20);
        }

        // Deviation summary
        const devY = trendY + 35;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('IMPROVEMENT ANALYSIS', 14, devY);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const improvedCount = summaries.filter(s => {
          const prev = prevAvgMap[s.studentId];
          return prev !== null && prev !== undefined && s.avgPct > prev;
        }).length;
        const declinedCount = summaries.filter(s => {
          const prev = prevAvgMap[s.studentId];
          return prev !== null && prev !== undefined && s.avgPct < prev;
        }).length;
        const sameCount = summaries.filter(s => {
          const prev = prevAvgMap[s.studentId];
          return prev !== null && prev !== undefined && Math.abs(s.avgPct - prev) <= 1;
        }).length;

        doc.text(`Students who improved: ${improvedCount}`, 14, devY + 10);
        doc.text(`Students who declined: ${declinedCount}`, 75, devY + 10);
        doc.text(`Students with consistent performance: ${sameCount}`, 130, devY + 10);

        // Class position distribution
        const distY = devY + 25;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('POSITION DISTRIBUTION', 14, distY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');

        const third = Math.ceil(totalStudents / 3);
        const topThird = summaries.filter(s => s.position <= third).length;
        const midThird = summaries.filter(s => s.position > third && s.position <= third * 2).length;
        const botThird = summaries.filter(s => s.position > third * 2).length;

        doc.text(`Top Third (positions 1-${third}): ${topThird} students`, 14, distY + 10);
        drawBar(doc, 90, distY + 6, 80, totalStudents > 0 ? topThird / totalStudents : 0, [22, 163, 74]);
        doc.text(`Middle Third (positions ${third + 1}-${third * 2}): ${midThird} students`, 14, distY + 20);
        drawBar(doc, 90, distY + 16, 80, totalStudents > 0 ? midThird / totalStudents : 0, [37, 99, 235]);
        doc.text(`Bottom Third (positions ${third * 2 + 1}-${totalStudents}): ${botThird} students`, 14, distY + 30);
        drawBar(doc, 90, distY + 26, 80, totalStudents > 0 ? botThird / totalStudents : 0, [249, 115, 22]);

        // Key recommendations
        const recY = distY + 45;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('KEY RECOMMENDATIONS', 14, recY);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const recs: string[] = [];
        if (weakestSubjects.length > 0) recs.push(`Focus on improving ${weakestSubjects[0].name} (lowest average at ${weakestSubjects[0].mean.toFixed(1)}%).`);
        if (needAttention.length > 0) recs.push(`${needAttention.length} student${needAttention.length > 1 ? 's' : ''} need${needAttention.length === 1 ? 's' : ''} immediate intervention (dropped >10%).`);
        if (mostImprovedSubjects.length > 0) recs.push(`Maintain the great progress in ${mostImprovedSubjects[0].name} (improved by +${(mostImprovedSubjects[0].change || 0).toFixed(1)}%).`);
        recs.push(`Class target for next term: Improve class average from ${classMean.toFixed(1)}% to ${(classMean + 5).toFixed(1)}%.`);
        recs.forEach((r, i) => {
          doc.text(`${i + 1}. ${r}`, 20, recY + 10 + i * 6);
        });

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by CBE-Analytics School Management System | Page 5 of 5', 105, 290, { align: 'center' });
      }

      doc.save(`class_results_${classObj?.name}_${termObj?.name}_${termObj?.academic_year}.pdf`);
      toast.success('Complete Class Results PDF downloaded with all 5 sections!');
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
      console.error(err);
    }
    setGeneratingPDF(false);
  };

  // ── FEATURE 3: Bulk Report Cards ────────────────────────────────────────────
  /** Get previous term object from the terms list */
  const getPreviousTerm = (currentTermId: string) => {
    if (!terms.length) return null;
    const sortedTerms = [...terms].sort((a, b) => {
      if (a.academic_year !== b.academic_year) return Number(a.academic_year) - Number(b.academic_year);
      const termNum = (n: string) => n.includes('1') ? 1 : n.includes('2') ? 2 : 3;
      return termNum(a.name) - termNum(b.name);
    });
    const currentIdx = sortedTerms.findIndex(t => t.id === currentTermId);
    if (currentIdx <= 0) return null;
    return sortedTerms[currentIdx - 1];
  };

  const downloadBulkReportCards = async () => {
    if (!selectedClass || !selectedTerm) { toast.error('Please select a class and term'); return; }
    setGeneratingBulk(true);
    try {
      const rawResults = await fetchClassResults();
      if (!rawResults || rawResults.length === 0) {
        toast.error('No results found for this class and term');
        setGeneratingBulk(false);
        return;
      }
      const classObj = classes.find(c => c.id === selectedClass);
      const band = getSchoolLevelBand(classObj);
      const isPrimary = band === 'primary';
      const is844 = band === '844';
      const allSubjects = Array.from(new Set(rawResults.map((r: any) => r.subjects?.name).filter(Boolean))) as string[];
      const summaries = buildStudentSummary(rawResults, classObj);
      const termObj = terms.find(t => t.id === selectedTerm);
      const totalStudents = summaries.length;

      const prevAvgMap: Record<string, number | null> = {};
      for (const s of summaries) {
        prevAvgMap[s.studentId] = await fetchPreviousTermAvg(s.studentId, selectedTerm);
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      // Compute best per subject for the whole class (used per student below)
      const bulkBestPerSubject = computeBestPerSubject(rawResults, classObj);

      summaries.forEach((s: any, idx: number) => {
        if (idx > 0) doc.addPage();

        const prevAvg = prevAvgMap[s.studentId];
        const deviation = prevAvg !== null && prevAvg !== undefined ? s.avgPct - prevAvg : null;
        const isNew = deviation === null;

        const subjectEntries = Object.entries(s.subjects).filter(([k]) => !k.endsWith('_grade') && !k.endsWith('_points')) as [string, number][];
        const sortedBest = [...subjectEntries].sort((a, b) => b[1] - a[1]);
        const bestSubject = sortedBest[0]?.[0] || 'all subjects';
        const weakestSubject = sortedBest[sortedBest.length - 1]?.[0] || 'some subjects';

        const aiComment = generateAIComment(s.avgPct, deviation, bestSubject, weakestSubject, s.position, totalStudents, isNew, band);

        // Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 30, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(schoolName, 105, 12, { align: 'center' });
        doc.setFontSize(11);
        doc.text('STUDENT REPORT CARD', 105, 22, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const y = 38;
        doc.text(`Student: ${s.student?.first_name || ''} ${s.student?.last_name || ''}`, 14, y);
        doc.text(`Adm No: ${s.student?.admission_number || 'N/A'}`, 14, y + 7);
        doc.text(`Class: ${classObj?.name || 'N/A'}`, 14, y + 14);
        doc.text(`Term: ${termObj?.name || ''} ${termObj?.academic_year || ''}`, 120, y);
        doc.text(`Position: ${s.position}${s.position === 1 ? 'st' : s.position === 2 ? 'nd' : s.position === 3 ? 'rd' : 'th'} out of ${totalStudents}`, 120, y + 7);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, y + 14);

        doc.setDrawColor(37, 99, 235);
        doc.line(14, y + 20, 196, y + 20);

        // Subject rows adapted for school level
        const subjectRows = subjectEntries.map(([subName, pct]) => {
          let gradeLabel: string;
          let pointsVal: string;
          let descriptor: string;
          if (is844) {
            const g = overallGrade844(pct);
            gradeLabel = g.grade;
            pointsVal = String(g.points);
            descriptor = g.descriptor;
          } else {
            const g = overallGradeWithBand(pct, band);
            gradeLabel = g.subLevel;
            pointsVal = isPrimary ? '—' : String(g.points);
            descriptor = g.descriptor;
          }
          return isPrimary
            ? [subName, `${pct.toFixed(0)}%`, gradeLabel, descriptor]
            : [subName, `${pct.toFixed(0)}%`, gradeLabel, pointsVal, descriptor];
        });

        autoTable(doc, {
          startY: y + 25,
          head: [isPrimary
            ? ['Subject', 'Percentage', is844 ? '8-4-4 Grade' : 'CBE Grade', 'Descriptor']
            : ['Subject', 'Percentage', is844 ? '8-4-4 Grade' : 'CBE Grade', 'Points', 'Descriptor']
          ],
          body: subjectRows,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235], textColor: 255 },
          alternateRowStyles: { fillColor: [245, 247, 255] },
        });

        const tableEnd = (doc as any).lastAutoTable.finalY + 8;

        // Summary box
        const gr = is844 ? overallGrade844(s.avgPct) : overallGradeWithBand(s.avgPct, band);
        doc.setFillColor(245, 247, 255);
        doc.rect(14, tableEnd, 182, 25, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(`Average: ${s.avgPct.toFixed(1)}%`, 20, tableEnd + 8);
        doc.text(`Grade: ${is844 ? (gr as any).grade : (gr as any).subLevel}`, 70, tableEnd + 8);
        doc.text(`Position: ${s.position}/${totalStudents}`, 120, tableEnd + 8);
        if (!isPrimary) {
          doc.text(`Points: ${s.totalPoints}`, 160, tableEnd + 8);
        }
        doc.text(`Total: ${s.totalPct.toFixed(0)}/${allSubjects.length * 100}`, 20, tableEnd + 17);
        if (!isPrimary) {
          doc.text(`${(gr as any).descriptor}`, 70, tableEnd + 17);
        }

        // Deviation
        let devText = 'First Term — No previous data';
        if (deviation !== null) {
          const arrow = deviation >= 0 ? '\u25B2' : '\u25BC';
          const sign = deviation >= 0 ? '+' : '';
          devText = `${arrow} ${sign}${deviation.toFixed(1)}% vs previous term`;
        }
        doc.setFont('helvetica', 'normal');
        if (deviation !== null && deviation >= 0) doc.setTextColor(22, 163, 74);
        else if (deviation !== null && deviation < 0) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(100, 100, 100);
        doc.text(devText, 120, tableEnd + 17);
        doc.setTextColor(0, 0, 0);

        // Best in Subject Achievement for this student (bulk)
        const bulkStudentBests = bulkBestPerSubject.filter(b => b.studentId === (s.student?.id || s.studentId));
        let bulkAchievementY = tableEnd + 30;
        if (bulkStudentBests.length > 0) {
          doc.setFillColor(254, 249, 195);
          doc.rect(14, bulkAchievementY, 182, 6 + bulkStudentBests.length * 6, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(202, 138, 4);
          doc.text('ACHIEVEMENT:', 18, bulkAchievementY + 5);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          bulkStudentBests.forEach((b, bi) => {
            const pts = b.points !== null ? ` (${b.points} pts)` : '';
            doc.text(`🏆 Best in ${b.subjectName}: ${b.percentage}% — ${b.gradeLabel}${pts}`, 18, bulkAchievementY + 11 + bi * 6);
          });
          bulkAchievementY += 6 + bulkStudentBests.length * 6 + 4;
        }

        // AI Comment (enhanced)
        const commentY = bulkAchievementY + 2;
        doc.setFillColor(254, 252, 232);
        doc.rect(14, commentY, 182, 32, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Class Teacher\'s Comment:', 18, commentY + 7);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const commentLines = doc.splitTextToSize(aiComment, 170);
        doc.text(commentLines, 18, commentY + 14);

        // Signatures
        const sigY = commentY + 42;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);
        doc.text('Class Teacher Signature: ___________________________', 14, sigY);
        doc.text('Principal Signature: ___________________________', 120, sigY);
        doc.text('Date: ___________________', 14, sigY + 10);
        doc.text('School Stamp:', 120, sigY + 10);

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${idx + 1} of ${totalStudents} | CBE-Analytics School Management System`, 105, 290, { align: 'center' });
      });

      doc.save(`bulk_report_cards_${classObj?.name}_${termObj?.name}_${termObj?.academic_year}.pdf`);
      toast.success(`Bulk report cards generated for ${totalStudents} students!`);
    } catch (err: any) {
      toast.error('Failed to generate bulk report cards: ' + err.message);
      console.error(err);
    }
    setGeneratingBulk(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Results</h1>
        <p className="text-sm text-[#666666]">View and download class results with deviation analysis</p>
      </div>

      {/* PDF Generation Panel */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-semibold text-[#111111] mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Generate Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-[#666666] mb-1">Select Class</label>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#666666] mb-1">Select Term</label>
            <select
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
            >
              <option value="">-- Select Term --</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadClassResultsPDF}
            disabled={generatingPDF || !selectedClass || !selectedTerm}
            className="flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
          >
            {generatingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {generatingPDF ? 'Generating...' : 'Download Class Results PDF'}
          </button>
          <button
            onClick={downloadBulkReportCards}
            disabled={generatingBulk || !selectedClass || !selectedTerm}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {generatingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generatingBulk ? 'Generating...' : 'Bulk Report Cards (All Students)'}
          </button>
          <button
            onClick={publishResults}
            disabled={publishing || !selectedClass || !selectedTerm}
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishing ? 'Publishing...' : 'Publish & Notify'}
          </button>
        </div>
          <p className="text-xs text-[#999] mt-2">
          Class Results PDF includes all 5 sections: Class Summary, Subject Analysis, Student Results Table, Individual Report Cards &amp; Performance Trends. Bulk Report Cards include personalised AI comments per student.
        </p>
      </div>

      {/* Best Student Per Subject Panel */}
      {bestPerSubjectList.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-[#111111]">Best Student Per Subject</h2>
            <span className="text-xs text-gray-400 ml-auto">{classes.find(c => c.id === selectedClass)?.name} — {terms.find(t => t.id === selectedTerm)?.name} {terms.find(t => t.id === selectedTerm)?.academic_year}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bestPerSubjectList.map((b, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                <span className="text-xl mt-0.5">🏆</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide truncate">{b.subjectName}</p>
                  <p className="text-sm font-medium text-[#111111] truncate">{b.studentName}</p>
                  <p className="text-xs text-green-700 font-bold">
                    {b.percentage}% — {b.gradeLabel}{b.points !== null ? ` (${b.points} pts)` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Results Table */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by student or subject..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Student</th>
                <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Subject</th>
                <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Marks</th>
                <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Grade</th>
                <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Points</th>
                <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">DEV</th>
                <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-[#666666]">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-sm text-[#666666]">No results found</td></tr>
              ) : (
                filtered.map(r => {
                  const dev = r.deviation;
                  return (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-xs font-bold">
                            <Award className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-sm font-medium">{r.students?.first_name} {r.students?.last_name}</span>
                            <br />
                            <span className="text-xs text-[#666666]">{r.students?.admission_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#666666]">{r.subjects?.name}</td>
                      <td className="px-6 py-4 text-sm font-medium">{r.percentage !== undefined && r.percentage !== null ? r.percentage : Math.round((r.marks / (r.out_of || 100)) * 100)}%</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColor(r.cbc_grade || r.grade_844)}`}>
                          {r.cbc_grade || r.grade_844}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#666666]">{r.cbc_points || r.points_844}</td>
                      <td className="px-6 py-4">
                        {dev !== null && dev !== undefined ? (
                          <span className={`flex items-center gap-1 text-xs font-semibold ${Number(dev) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {Number(dev) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {Number(dev) >= 0 ? '+' : ''}{Number(dev).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Minus className="w-3 h-3" />NEW</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          r.status === 'published' ? 'bg-green-100 text-green-700' :
                          r.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
