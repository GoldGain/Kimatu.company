import { useState, useEffect } from 'react';
import { supabaseUntyped } from "@/lib/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { Search, Award, Download, FileText, Loader2, TrendingUp, TrendingDown, Minus, Send, Bell } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

// ── Grade helpers ──────────────────────────────────────────────────────────────
import { calculateCompetencyGrade, getSchoolLevelBand } from '@/lib/grading';

function calculateCBEGrade(pct: number, classData?: { curriculum?: string | null; level?: number | string | null; name?: string | null }) {
  const band = getSchoolLevelBand(classData);
  const g = calculateCompetencyGrade(pct, band === '844' ? 'junior' : band);
  return { subLevel: g.subLevel, grade: g.grade, points: g.points };
}

function overallGradeLabel(avgPct: number) {
  if (avgPct >= 75) return 'EE';
  if (avgPct >= 58) return 'ME';
  if (avgPct >= 31) return 'AE';
  return 'BE';
}

// ── AI comment generator ───────────────────────────────────────────────────────
function generateAIComment(
  avgPct: number,
  deviation: number | null,
  bestSubject: string,
  weakestSubject: string,
  position: number,
  totalStudents: number,
  isNew: boolean
): string {
  if (position <= 3 && totalStudents >= 3) {
    const rank = position === 1 ? '1st' : position === 2 ? '2nd' : '3rd';
    return `Outstanding! You are among the top performers (${rank} in class). Your mastery of ${bestSubject} is impressive. Remember, the sky is not the limit!`;
  }
  if (isNew || deviation === null) {
    const grade = overallGradeLabel(avgPct);
    return `Welcome! You have shown ${grade} performance. Strong in ${bestSubject}. Keep working hard!`;
  }
  const dev = Math.abs(deviation);
  if (deviation > 5) {
    return `Excellent improvement! You rose by ${dev.toFixed(1)}%. Your hard work in ${bestSubject} paid off. The sky is not the limit!`;
  }
  if (deviation > 1) {
    return `Good progress! You improved by ${dev.toFixed(1)}%. Keep working on ${weakestSubject}.`;
  }
  if (deviation >= -1) {
    return `Consistent performance. You are strong in ${bestSubject}. Let's improve ${weakestSubject}.`;
  }
  if (deviation >= -5) {
    return `Your performance dropped slightly by ${dev.toFixed(1)}%. Focus on ${weakestSubject} next term.`;
  }
  return `Your performance dropped by ${dev.toFixed(1)}%. Let's identify challenges. We believe you will bounce back.`;
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

  const buildStudentSummary = (rawResults: any[]) => {
    const byStudent: Record<string, any> = {};
    rawResults.forEach((r: any) => {
      const sid = r.students?.id || r.student_id;
      if (!byStudent[sid]) {
        byStudent[sid] = { student: r.students, subjects: {}, totalPct: 0, count: 0 };
      }
      const pct = r.percentage || (r.out_of > 0 ? (r.marks / r.out_of) * 100 : 0);
      const subName = r.subjects?.name || 'Unknown';
      byStudent[sid].subjects[subName] = pct;
      byStudent[sid].totalPct += pct;
      byStudent[sid].count += 1;
    });
    const summaries = Object.entries(byStudent).map(([sid, v]: [string, any]) => ({
      studentId: sid,
      student: v.student,
      subjects: v.subjects,
      avgPct: v.count > 0 ? v.totalPct / v.count : 0,
      totalPct: v.totalPct,
      subjectCount: v.count,
      position: 0,
    }));
    summaries.sort((a, b) => b.avgPct - a.avgPct);
    summaries.forEach((s, i) => { s.position = i + 1; });
    return summaries;
  };

  // ── FEATURE 1: Class Results PDF with DEV column ────────────────────────────
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
      const summaries = buildStudentSummary(rawResults);
      const classObj = classes.find(c => c.id === selectedClass);
      const termObj = terms.find(t => t.id === selectedTerm);
      const allSubjects = Array.from(new Set(rawResults.map((r: any) => r.subjects?.name).filter(Boolean))) as string[];

      const prevAvgMap: Record<string, number | null> = {};
      for (const s of summaries) {
        prevAvgMap[s.studentId] = await fetchPreviousTermAvg(s.studentId, selectedTerm);
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 297, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(schoolName, 148.5, 9, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`${classObj?.name || 'Class'} Results - ${termObj?.name || 'Term'} ${termObj?.academic_year || ''}`, 148.5, 17, { align: 'center' });

      const subjectCols = allSubjects.map(s => shortName(s));
      const headers = ['POS', 'STUDENT NAME', ...subjectCols, 'TOTAL', 'AVG%', 'DEV', 'GRADE'];
      const devColIdx = headers.indexOf('DEV');

      const rows = summaries.map((s: any) => {
        const prevAvg = prevAvgMap[s.studentId];
        const deviation = prevAvg !== null && prevAvg !== undefined ? s.avgPct - prevAvg : null;
        let devStr = 'NEW';
        if (deviation !== null) {
          devStr = deviation >= 0 ? `+${deviation.toFixed(1)}%` : `${deviation.toFixed(1)}%`;
        }
        const subjectMarks = allSubjects.map(sub => {
          const pct = s.subjects[sub];
          return pct !== undefined ? `${pct.toFixed(0)}%` : '-';
        });
        return [
          String(s.position),
          `${s.student?.first_name || ''} ${s.student?.last_name || ''}`,
          ...subjectMarks,
          `${s.totalPct.toFixed(0)}`,
          `${s.avgPct.toFixed(1)}%`,
          devStr,
          overallGradeLabel(s.avgPct),
        ];
      });

      const classMean = summaries.length ? summaries.reduce((s, v) => s + v.avgPct, 0) / summaries.length : 0;
      const subjectMeans = allSubjects.map(sub => {
        const vals = summaries.map(s => s.subjects[sub]).filter(v => v !== undefined);
        const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return `${mean.toFixed(1)}%`;
      });
      rows.push(['', 'SUBJECT MEAN', ...subjectMeans, '', `${classMean.toFixed(1)}%`, '', '']);

      autoTable(doc, {
        startY: 26,
        head: [headers],
        body: rows,
        styles: { fontSize: 7, cellPadding: 1.5 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontSize: 7, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 255] },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === devColIdx) {
            const cellText = String(data.cell.raw || '');
            if (cellText.startsWith('+')) {
              data.cell.styles.textColor = [22, 163, 74];
              data.cell.styles.fontStyle = 'bold';
            } else if (cellText.startsWith('-')) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.textColor = [100, 100, 100];
            }
          }
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CLASS ANALYSIS', 14, finalY);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Class Mean Grade: ${classMean.toFixed(1)}% (${overallGradeLabel(classMean)})  |  Total Students: ${summaries.length}`, 14, finalY + 8);

      const top5 = summaries.slice(0, 5);
      doc.setFont('helvetica', 'bold');
      doc.text('Top 5 Performers:', 14, finalY + 18);
      doc.setFont('helvetica', 'normal');
      top5.forEach((s: any, i: number) => {
        doc.text(`${i + 1}. ${s.student?.first_name} ${s.student?.last_name} - ${s.avgPct.toFixed(1)}%`, 20, finalY + 25 + i * 6);
      });

      const improved = summaries
        .filter(s => prevAvgMap[s.studentId] !== null && prevAvgMap[s.studentId] !== undefined)
        .map(s => ({ ...s, dev: s.avgPct - (prevAvgMap[s.studentId] as number) }))
        .sort((a: any, b: any) => b.dev - a.dev)
        .slice(0, 3);
      if (improved.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Most Improved:', 110, finalY + 18);
        doc.setFont('helvetica', 'normal');
        improved.forEach((s: any, i: number) => {
          doc.text(`${i + 1}. ${s.student?.first_name} ${s.student?.last_name} (+${s.dev.toFixed(1)}%)`, 116, finalY + 25 + i * 6);
        });
      }

      const needAttention = [...summaries].reverse().slice(0, 3);
      doc.setFont('helvetica', 'bold');
      doc.text('Students Needing Attention:', 200, finalY + 18);
      doc.setFont('helvetica', 'normal');
      needAttention.forEach((s: any, i: number) => {
        doc.text(`${i + 1}. ${s.student?.first_name} ${s.student?.last_name} - ${s.avgPct.toFixed(1)}%`, 206, finalY + 25 + i * 6);
      });

      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by CBE-Analytics School Management System', 148.5, 200, { align: 'center' });

      doc.save(`class_results_${classObj?.name}_${termObj?.name}_${termObj?.academic_year}.pdf`);
      toast.success('Class Results PDF downloaded! Check the DEV column for deviation arrows.');
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
      console.error(err);
    }
    setGeneratingPDF(false);
  };

  // ── FEATURE 3: Bulk Report Cards ────────────────────────────────────────────
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
      const summaries = buildStudentSummary(rawResults);
      const classObj = classes.find(c => c.id === selectedClass);
      const termObj = terms.find(t => t.id === selectedTerm);
      const totalStudents = summaries.length;

      const prevAvgMap: Record<string, number | null> = {};
      for (const s of summaries) {
        prevAvgMap[s.studentId] = await fetchPreviousTermAvg(s.studentId, selectedTerm);
      }

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      summaries.forEach((s: any, idx: number) => {
        if (idx > 0) doc.addPage();

        const prevAvg = prevAvgMap[s.studentId];
        const deviation = prevAvg !== null && prevAvg !== undefined ? s.avgPct - prevAvg : null;
        const isNew = deviation === null;

        const subjectEntries = Object.entries(s.subjects) as [string, number][];
        const sortedBest = [...subjectEntries].sort((a, b) => b[1] - a[1]);
        const bestSubject = sortedBest[0]?.[0] || 'all subjects';
        const weakestSubject = sortedBest[sortedBest.length - 1]?.[0] || 'some subjects';

        const aiComment = generateAIComment(s.avgPct, deviation, bestSubject, weakestSubject, s.position, totalStudents, isNew);

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
        doc.text(`Position: ${s.position} / ${totalStudents}`, 120, y + 7);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, y + 14);

        doc.setDrawColor(37, 99, 235);
        doc.line(14, y + 20, 196, y + 20);

        const subjectRows = subjectEntries.map(([subName, pct]) => {
          const cbcG = calculateCBEGrade(pct, classObj);
          return [subName, `${pct.toFixed(0)}%`, cbcG.subLevel, String(cbcG.points)];
        });

        autoTable(doc, {
          startY: y + 25,
          head: [['Subject', 'Percentage', 'CBE Grade', 'Points']],
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
        doc.text(`Average: ${s.avgPct.toFixed(1)}%`, 20, tableEnd + 8);
        doc.text(`Grade: ${overallGradeLabel(s.avgPct)}`, 70, tableEnd + 8);
        doc.text(`Position: ${s.position}/${totalStudents}`, 120, tableEnd + 8);

        // Deviation
        let devText = 'First Term - No previous data';
        if (deviation !== null) {
          const arrow = deviation >= 0 ? '\u25B2' : '\u25BC';
          const sign = deviation >= 0 ? '+' : '';
          devText = `${arrow} ${sign}${deviation.toFixed(1)}% vs previous term (Prev avg: ${prevAvg?.toFixed(1)}%)`;
        }
        doc.setFont('helvetica', 'normal');
        if (deviation !== null && deviation >= 0) doc.setTextColor(22, 163, 74);
        else if (deviation !== null && deviation < 0) doc.setTextColor(220, 38, 38);
        else doc.setTextColor(100, 100, 100);
        doc.text(`Deviation: ${devText}`, 20, tableEnd + 17);
        doc.setTextColor(0, 0, 0);

        // AI Comment
        const commentY = tableEnd + 30;
        doc.setFillColor(254, 252, 232);
        doc.rect(14, commentY, 182, 22, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Class Teacher\'s Comment:', 18, commentY + 7);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const commentLines = doc.splitTextToSize(aiComment, 170);
        doc.text(commentLines, 18, commentY + 14);

        // Signatures
        const sigY = commentY + 32;
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
          Class Results PDF includes DEV column (green +% = improved, red -% = dropped). Bulk Report Cards include personalised comments per student.
        </p>
      </div>

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
