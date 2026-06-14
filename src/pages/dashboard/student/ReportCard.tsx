import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileText, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSchoolLevelBand, gradeDisplayLabel, calculateCompetencyGrade, calculate844Grade } from '@/lib/grading';
import { computeBestPerSubject } from '@/lib/bestPerSubject';
import type { BestInSubject } from '@/lib/bestPerSubject';

function getPercentage(result: any): number {
  if (result.percentage !== undefined && result.percentage !== null) return Number(result.percentage);
  const outOf = Number(result.out_of || 100);
  return outOf > 0 ? Math.round((Number(result.marks || 0) / outOf) * 100) : 0;
}

// Use shared grading library — grade_level takes priority over level
function isPrimaryLevel(classData: any): boolean {
  const gl = classData?.grade_level ?? classData?.level;
  return Number(gl || 0) <= 6;
}

function gradeFromPercentage(percentage: number, classData: any) {
  const curriculum = String(classData?.curriculum || 'CBE').toUpperCase();
  if (curriculum === '844' || curriculum === '8-4-4') {
    const g = calculate844Grade(percentage);
    return { grade: g.grade, points: g.points, descriptor: g.descriptor, is844: true };
  }
  const band = getSchoolLevelBand(classData);
  const g = calculateCompetencyGrade(percentage, band);
  return { grade: g.subLevel, points: g.points || null, descriptor: g.descriptor, is844: false };
}

function overallGradeLabel(avgPct: number, classData?: any) {
  return gradeFromPercentage(avgPct, classData).grade;
}

function get844Grade(percentage: number) {
  if (percentage >= 80) return { grade: 'A', points: 12, descriptor: 'Excellent' };
  if (percentage >= 75) return { grade: 'A-', points: 11, descriptor: 'Very Good' };
  if (percentage >= 70) return { grade: 'B+', points: 10, descriptor: 'Good' };
  if (percentage >= 65) return { grade: 'B', points: 9, descriptor: 'Good' };
  if (percentage >= 60) return { grade: 'B-', points: 8, descriptor: 'Good' };
  if (percentage >= 55) return { grade: 'C+', points: 7, descriptor: 'Average' };
  if (percentage >= 50) return { grade: 'C', points: 6, descriptor: 'Average' };
  if (percentage >= 45) return { grade: 'C-', points: 5, descriptor: 'Average' };
  if (percentage >= 40) return { grade: 'D+', points: 4, descriptor: 'Below Average' };
  if (percentage >= 35) return { grade: 'D', points: 3, descriptor: 'Below Average' };
  if (percentage >= 30) return { grade: 'D-', points: 2, descriptor: 'Below Average' };
  return { grade: 'E', points: 1, descriptor: 'Poor' };
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

function formatPosition(position: number | null, totalStudents: number): string {
  if (!position) return 'N/A';
  return `${ordinal(position)} out of ${totalStudents || '—'}`;
}

function generateAIComment(
  avgPct: number,
  deviation: number | null,
  bestSubject: string,
  weakestSubject: string,
  position: number | null,
  totalStudents: number,
  isNew: boolean
): string {
  if (position !== null && position <= 3 && totalStudents >= 3) {
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

export default function StudentReportCard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previousAvg, setPreviousAvg] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: studentData } = await supabaseUntyped
        .from('students')
        .select('*, classes(name, level, grade_level, curriculum)')
        .eq('profile_id', user?.id)
        .single();
      setStudent(studentData);
      if (studentData) {
        const { count } = await supabaseUntyped
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', studentData.class_id)
          .eq('school_id', studentData.school_id);
        setTotalStudents(count || 0);

        const { data: termsData } = await supabaseUntyped
          .from('terms')
          .select('*')
          .eq('school_id', studentData.school_id)
          .order('academic_year', { ascending: false });
        setTerms(termsData || []);
        if (termsData && termsData.length > 0) {
          setSelectedTerm(termsData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedTerm && student) {
      fetchResults();
    }
  }, [selectedTerm, student]);

  const fetchResults = async () => {
    if (!student || !selectedTerm) return;
    const { data } = await supabaseUntyped
      .from('results')
      .select('*, subjects(name), terms(name, academic_year)')
      .eq('student_id', student.id)
      .eq('term_id', selectedTerm)
      .order('subjects(name)');
    setResults(data || []);
    // Fetch previous term average
    await fetchPreviousAvg();
    // Fetch class-wide results to compute best per subject
    await fetchClassBestPerSubject();
  };

  const fetchClassBestPerSubject = async () => {
    if (!student || !selectedTerm) return;
    const { data: classResults } = await supabaseUntyped
      .from('results')
      .select('*, students(id, first_name, last_name), subjects(name)')
      .eq('class_id', student.class_id)
      .eq('term_id', selectedTerm);
    if (classResults && classResults.length > 0) {
      setClassBestList(computeBestPerSubject(classResults, student?.classes || {}));
    } else {
      setClassBestList([]);
    }
  };

  const fetchPreviousAvg = async () => {
    if (!student || !selectedTerm || terms.length === 0) { setPreviousAvg(null); return; }
    const sortedTerms = [...terms].sort((a, b) => {
      if (a.academic_year !== b.academic_year) return Number(a.academic_year) - Number(b.academic_year);
      const termNum = (n: string) => n.includes('1') ? 1 : n.includes('2') ? 2 : 3;
      return termNum(a.name) - termNum(b.name);
    });
    const currentIdx = sortedTerms.findIndex(t => t.id === selectedTerm);
    if (currentIdx <= 0) { setPreviousAvg(null); return; }
    const prevTerm = sortedTerms[currentIdx - 1];
    const { data: prevResults } = await supabaseUntyped
      .from('results')
      .select('marks, out_of, percentage')
      .eq('student_id', student.id)
      .eq('term_id', prevTerm.id);
    if (!prevResults || prevResults.length === 0) { setPreviousAvg(null); return; }
    const totalPct = prevResults.reduce((s: number, r: any) => s + (r.percentage || (r.out_of > 0 ? (r.marks / r.out_of) * 100 : 0)), 0);
    setPreviousAvg(totalPct / prevResults.length);
  };

  const [schoolName, setSchoolName] = useState('');
  const [classBestList, setClassBestList] = useState<BestInSubject[]>([]);

  useEffect(() => {
    if (student?.school_id) {
      fetchSchoolName(student.school_id);
    }
  }, [student?.school_id]);

  const fetchSchoolName = async (schoolId: string) => {
    const { data } = await supabaseUntyped.from('schools').select('name, curriculum').eq('id', schoolId).maybeSingle();
    if (data?.name) setSchoolName(data.name);
  };

  // Determine curriculum: 'CBE' or '844'
  const curriculum = (student?.curriculum || 'CBE') as 'CBE' | '844';
  const is844 = curriculum === '844';

  const generatePDF = async () => {
    if (!results.length) { toast.error('No results found for this term'); return; }
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const term = terms.find(t => t.id === selectedTerm);
      const displaySchoolName = schoolName || 'School';

      // Use grade_level first (new column), fall back to level
      const level = student.classes?.grade_level ?? student.classes?.level;
      const totalMarks = results.reduce((s, r) => s + (Number(r.marks || 0)), 0);
      const avgPercentage = results.length ? (results.reduce((s, r) => s + getPercentage(r), 0) / results.length) : 0;

      // Use appropriate grading system based on curriculum
      const classDataForGrading = student?.classes || {};
      const totalPoints = is844
        ? results.reduce((s, r) => s + (get844Grade(getPercentage(r)).points || 0), 0)
        : (isPrimaryLevel(classDataForGrading) ? null : results.reduce((s, r) => s + (gradeFromPercentage(getPercentage(r), classDataForGrading).points || 0), 0));

      // Deviation
      const deviation = previousAvg !== null ? avgPercentage - previousAvg : null;
      const isNew = deviation === null;

      // Best and weakest subjects
      const subjectScores = results.map(r => ({ name: r.subjects?.name || 'Unknown', pct: getPercentage(r) }));
      const sortedBest = [...subjectScores].sort((a, b) => b.pct - a.pct);
      const bestSubject = sortedBest[0]?.name || 'all subjects';
      const weakestSubject = sortedBest[sortedBest.length - 1]?.name || 'some subjects';

      // Class position
      const position = results[0]?.class_position || results[0]?.position || null;

      // AI comment
      const aiComment = generateAIComment(avgPercentage, deviation, bestSubject, weakestSubject, position, totalStudents || 0, isNew);

      // Header
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(displaySchoolName, 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text('STUDENT REPORT CARD', 105, 25, { align: 'center' });

      // Student Info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const y = 45;
      doc.text(`Student Name: ${student.first_name} ${student.last_name}`, 14, y);
      doc.text(`Admission No: ${student.admission_number}`, 14, y + 7);
      doc.text(`Class: ${student.classes?.name || 'N/A'}`, 14, y + 14);
      doc.text(`Term: ${term?.name || ''} ${term?.academic_year || ''}`, 120, y);
      doc.text(`Academic Year: ${term?.academic_year || ''}`, 120, y + 7);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, y + 14);

      doc.setDrawColor(37, 99, 235);
      doc.line(14, y + 20, 196, y + 20);

      // Results Table - Use ONLY the curriculum's grading system
      const tableHead = is844
        ? ['#', 'Subject', 'Marks', 'Out Of', 'Percentage', '8-4-4 Grade', 'Points', 'Descriptor']
        : ['#', 'Subject', 'Marks', 'Out Of', 'Percentage', 'CBE Grade', 'Points', 'Descriptor'];

      const tableBody = results.map((r, i) => {
        const percentage = getPercentage(r);
        const grading = is844 ? get844Grade(percentage) : gradeFromPercentage(percentage, classDataForGrading);
        return [
          i + 1,
          r.subjects?.name || 'N/A',
          r.marks || '0',
          r.out_of || 100,
          `${percentage}%`,
          grading.grade,
          grading.points ?? '—',
          grading.descriptor,
        ];
      });

      autoTable(doc, {
        startY: y + 25,
        head: [tableHead],
        body: tableBody,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 255] },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Summary
      doc.setFillColor(245, 247, 255);
      doc.rect(14, finalY, 182, 25, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Subjects: ${results.length}`, 20, finalY + 8);
      doc.text(`Total Marks: ${totalMarks}`, 80, finalY + 8);
      doc.text(`Average: ${avgPercentage.toFixed(1)}%`, 150, finalY + 8);
      doc.text(`Class Position: ${formatPosition(position, totalStudents)}`, 20, finalY + 18);
      doc.text(`Overall Grade: ${is844 ? get844Grade(avgPercentage).grade : overallGradeLabel(avgPercentage, classDataForGrading)}`, 80, finalY + 18);
      if (totalPoints !== null) {
        doc.text(`Total Points: ${totalPoints}`, 150, finalY + 18);
      }

      // Deviation
      const devY = finalY + 32;
      if (deviation !== null) {
        const arrow = deviation >= 0 ? '\u25B2' : '\u25BC';
        const sign = deviation >= 0 ? '+' : '';
        if (deviation >= 0) doc.setTextColor(22, 163, 74);
        else doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
        doc.text(`${arrow} ${sign}${deviation.toFixed(1)}% vs previous term (Prev: ${previousAvg?.toFixed(1)}%)`, 14, devY);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'normal');
        doc.text('First Term — No previous data for comparison', 14, devY);
        doc.setTextColor(0, 0, 0);
      }

      // Best in Subject Achievement for this student
      const myBestSubjects = classBestList.filter(b => b.studentId === student.id);
      let studentAchievementY = devY + 10;
      if (myBestSubjects.length > 0) {
        doc.setFillColor(254, 249, 195);
        doc.rect(14, studentAchievementY, 182, 6 + myBestSubjects.length * 6, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(202, 138, 4);
        doc.text('YOUR ACHIEVEMENT:', 18, studentAchievementY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        myBestSubjects.forEach((b, bi) => {
          const pts = b.points !== null ? ` (${b.points} pts)` : '';
          doc.text(`🏆 You were the best in ${b.subjectName}: ${b.percentage}% — ${b.gradeLabel}${pts}`, 18, studentAchievementY + 11 + bi * 6);
        });
        studentAchievementY += 6 + myBestSubjects.length * 6 + 4;
      }

      // AI Comment
      const commentY = studentAchievementY + 2;
      doc.setFillColor(254, 252, 232);
      doc.rect(14, commentY, 182, 22, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Class Teacher\'s Comment:', 18, commentY + 7);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const commentLines = doc.splitTextToSize(aiComment, 170);
      doc.text(commentLines, 18, commentY + 14);

      // Signature Lines
      const sigY = commentY + 30;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('Class Teacher Comments:', 14, sigY);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, sigY + 10, 196, sigY + 10);
      doc.line(14, sigY + 20, 196, sigY + 20);
      doc.text('Class Teacher Signature: ___________________', 14, sigY + 35);
      doc.text('Principal Signature: ___________________', 120, sigY + 35);
      doc.text('Date: ___________________', 14, sigY + 45);
      doc.text('School Stamp:', 120, sigY + 45);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('CBE-Analytics School Management System | Support: support@cbe-analytics.com', 105, 285, { align: 'center' });

      doc.save(`report_card_${student.first_name}_${student.last_name}_${term?.name}.pdf`);
      toast.success('Report card downloaded!');
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    }
    setGenerating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Report Card</h1>
        <p className="text-sm text-[#666666]">Download your official academic report card</p>
      </div>
      {student && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#111111]">{student.first_name} {student.last_name}</h2>
              <p className="text-sm text-[#666666]">Admission: {student.admission_number}</p>
              <p className="text-sm text-[#666666]">Class: {student.classes?.name}</p>
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">{student.first_name?.[0]}{student.last_name?.[0]}</span>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4">Select Term</h3>
        <select
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
          className="w-full md:w-64 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
        >
          <option value="">Select Term</option>
          {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>)}
        </select>
      </div>
      {results.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[#111111]">Results Preview ({results.length} subjects)</h3>
            <div className="flex gap-2">
              <button
                onClick={generatePDF}
                disabled={generating}
                className="flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {generating ? 'Generating...' : 'Download PDF'}
              </button>
              <button
                onClick={() => {
                  const term = terms.find(t => t.id === selectedTerm);
                  const avg = results.length ? Math.round(results.reduce((s, r) => s + getPercentage(r), 0) / results.length) : 0;
                  const text = encodeURIComponent(`My CBE-Analytics Report Card\nTerm: ${term?.name || ''} ${term?.academic_year || ''}\nAverage: ${avg}%\nView at: ${window.location.origin}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700"
              >
                <Share2 className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Subject</th>
                  <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Marks</th>
                  <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">%</th>
                  <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">{is844 ? '8-4-4 Grade' : 'CBE Grade'}</th>
                  {!isPrimaryLevel(student?.classes?.level) && (
                    <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Points</th>
                  )}
                  <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Descriptor</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const percentage = getPercentage(r);
                  const grading = is844 ? get844Grade(percentage) : gradeFromPercentage(percentage, student?.classes?.level);
                  return (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{r.subjects?.name}</td>
                      <td className="py-2 px-3">{r.marks}</td>
                      <td className="py-2 px-3">{percentage}%</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          grading.grade.startsWith('EE') || grading.grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                          grading.grade.startsWith('ME') || grading.grade.startsWith('B') || grading.grade.startsWith('C') ? 'bg-blue-100 text-blue-700' :
                          grading.grade.startsWith('AE') || grading.grade.startsWith('D') ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>{grading.grade}</span>
                      </td>
                      {!isPrimaryLevel(student?.classes?.level) && (
                        <td className="py-2 px-3">{grading.points ?? '—'}</td>
                      )}
                      <td className="py-2 px-3 text-xs text-gray-600">{grading.descriptor}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {classBestList.filter(b => b.studentId === student?.id).length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-bold text-yellow-800">Your Achievements This Term</span>
              </div>
              {classBestList.filter(b => b.studentId === student?.id).map((b, i) => (
                <div key={i} className="text-sm text-yellow-900">
                  You were the best in <strong>{b.subjectName}</strong>: {b.percentage}% — {b.gradeLabel}{b.points !== null ? ` (${b.points} pts)` : ''}
                </div>
              ))}
            </div>
          )}
          {previousAvg !== null && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              <strong>Deviation from previous term:</strong> {
                (() => {
                  const totalPct = results.reduce((s, r) => s + getPercentage(r), 0);
                  const avg = results.length ? totalPct / results.length : 0;
                  const dev = avg - previousAvg;
                  return dev >= 0
                    ? `▲ +${dev.toFixed(1)}% improvement`
                    : `▼ ${dev.toFixed(1)}% drop`;
                })()
              } (Previous term avg: {previousAvg.toFixed(1)}%)
            </div>
          )}
        </div>
      )}
      {results.length === 0 && selectedTerm && (
        <div className="bg-white rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[#666666]">No results found for this term. Results will appear here once your teacher uploads them.</p>
        </div>
      )}
    </div>
  );
}
