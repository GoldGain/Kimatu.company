import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, FileText, Loader2, Users, Share2, Lock, CreditCard, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { calculateCompetencyGrade, getSchoolLevelBand } from '@/lib/grading';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, any>) => { openIframe: () => void };
    };
  }
}

function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve();
    const existing = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Paystack.')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack.'));
    document.body.appendChild(script);
  });
}

export default function ParentChildReportCard() {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [schoolPayConfig, setSchoolPayConfig] = useState<any>(null);
  const [pdfPaid, setPdfPaid] = useState<Record<string, boolean>>({});
  const [paying, setPaying] = useState(false);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => { fetchChildren(); }, [user?.id]);

  // Use shared grading library — grade_level takes priority over level
  function isPrimaryLevel(classData: any): boolean {
    const gl = classData?.grade_level ?? classData?.level;
    return Number(gl || 0) <= 6;
  }

  function gradeFromPercentage844(percentage: number) {
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

  function gradeFromPercentageCBE(percentage: number, classData: any) {
    const band = getSchoolLevelBand(classData);
    const g = calculateCompetencyGrade(percentage, band);
    return { grade: g.subLevel, points: g.points || null, descriptor: g.descriptor };
  }

  const fetchChildren = async () => {
    setLoading(true);
    const { data: links } = await supabaseUntyped
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user?.id);
    if (links && links.length > 0) {
      const ids = links.map((l: any) => l.student_id);
      const { data: students } = await supabaseUntyped
        .from('students')
        .select('*, classes(name, level, grade_level, curriculum)')
        .in('id', ids);
      setChildren(students || []);
      if (students && students.length > 0) {
        const firstChild = students[0] as any;
        setSelectedChild(firstChild);
        setStudentCurriculum(firstChild?.curriculum === '844' ? '844' : 'CBE');
        fetchTerms(firstChild.school_id);
        fetchSchoolPayConfig(firstChild.school_id);
        fetchSchoolName(firstChild.school_id);
      }
    }
    setLoading(false);
  };

  const [studentCurriculum, setStudentCurriculum] = useState<'CBE' | '844'>('CBE');

  const fetchSchoolName = async (schoolId: string) => {
    const { data } = await supabaseUntyped.from('schools').select('name').eq('id', schoolId).maybeSingle();
    if (data?.name) setSchoolName(data.name);
  };

  const fetchSchoolPayConfig = async (schoolId: string) => {
    const { data: school } = await supabaseUntyped
      .from('schools')
      .select('parent_pay_enabled, view_results_fee, pdf_report_fee, reseller_id')
      .eq('id', schoolId)
      .maybeSingle();
    if (!school) return;

    let resellerPaystackKey: string | null = null;
    if (school.reseller_id) {
      const { data: reseller } = await supabaseUntyped
        .from('resellers')
        .select('paystack_public_key, parent_pay_enabled')
        .eq('id', school.reseller_id)
        .maybeSingle();
      if (reseller?.parent_pay_enabled && reseller?.paystack_public_key) {
        resellerPaystackKey = reseller.paystack_public_key;
      }
    }

    setSchoolPayConfig({
      parent_pay_enabled: school.parent_pay_enabled && !!resellerPaystackKey,
      view_results_fee: school.view_results_fee || 50,
      pdf_report_fee: school.pdf_report_fee || 50,
      reseller_id: school.reseller_id,
      reseller_paystack_public_key: resellerPaystackKey,
      school_id: schoolId,
    });
  };

  const checkPdfPaid = async (childId: string): Promise<boolean> => {
    if (pdfPaid[childId]) return true;
    const { data } = await supabaseUntyped
      .from('parent_payments')
      .select('id')
      .eq('parent_id', user?.id)
      .eq('student_id', childId)
      .eq('payment_type', 'pdf_report')
      .eq('status', 'success')
      .limit(1);
    const paid = !!(data && data.length > 0);
    if (paid) setPdfPaid(prev => ({ ...prev, [childId]: true }));
    return paid;
  };

  const fetchTerms = async (schoolId: string) => {
    const { data } = await supabaseUntyped
      .from('terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('academic_year', { ascending: false });
    setTerms(data || []);
    if (data && data.length > 0) setSelectedTerm(data[0].id);
  };

  useEffect(() => {
    if (selectedChild && selectedTerm) fetchResults();
  }, [selectedChild, selectedTerm]);

  const fetchResults = async () => {
    if (!selectedChild || !selectedTerm) return;
    const { data } = await supabaseUntyped
      .from('results')
      .select('*, subjects(name)')
      .eq('student_id', selectedChild.id)
      .eq('term_id', selectedTerm);
    setResults(data || []);
  };

  const doGeneratePDF = async () => {
    if (!results.length) { toast.error('No results found for this term'); return; }
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const term = terms.find(t => t.id === selectedTerm);
      const displaySchoolName = schoolName || 'School';
      const is844 = studentCurriculum === '844';
      // Use grade_level first (new column), fall back to level
      const classDataForGrading = selectedChild?.classes || {};

      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(displaySchoolName, 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text('STUDENT REPORT CARD', 105, 25, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const y = 45;
      doc.text(`Student Name: ${selectedChild.first_name} ${selectedChild.last_name}`, 14, y);
      doc.text(`Admission No: ${selectedChild.admission_number}`, 14, y + 7);
      doc.text(`Class: ${selectedChild.classes?.name || 'N/A'}`, 14, y + 14);
      doc.text(`Term: ${term?.name || ''} ${term?.academic_year || ''}`, 120, y);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 120, y + 7);
      doc.setDrawColor(37, 99, 235);
      doc.line(14, y + 20, 196, y + 20);

      const totalMarks = results.reduce((s, r) => s + (Number(r.marks || 0)), 0);
      const avgPercentage = results.length ? Math.round(results.reduce((s, r) => s + (r.percentage !== undefined && r.percentage !== null ? r.percentage : Math.round((r.marks / (r.out_of || 100)) * 100)), 0) / results.length) : 0;

      const tableHead = is844
        ? ['#', 'Subject', 'Marks', 'Out Of', 'Percentage', '8-4-4 Grade', 'Points', 'Descriptor']
        : ['#', 'Subject', 'Marks', 'Out Of', 'Percentage', 'CBE Grade', 'Points', 'Descriptor'];

      const tableBody = results.map((r, i) => {
        const pct = r.percentage !== undefined && r.percentage !== null ? r.percentage : Math.round((r.marks / (r.out_of || 100)) * 100);
        const grading = is844 ? gradeFromPercentage844(pct) : gradeFromPercentageCBE(pct, classDataForGrading);
        return [
          i + 1, r.subjects?.name || 'N/A', r.marks || '-', r.out_of || 100,
          `${pct}%`, grading.grade, grading.points ?? '—', grading.descriptor,
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
      doc.setFillColor(245, 247, 255);
      doc.rect(14, finalY, 182, 25, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Subjects: ${results.length}`, 20, finalY + 8);
      doc.text(`Total Marks: ${totalMarks}`, 80, finalY + 8);
      doc.text(`Average: ${avgPercentage}%`, 150, finalY + 8);

      // Overall grade
      const overallGrading = is844 ? gradeFromPercentage844(avgPercentage) : gradeFromPercentageCBE(avgPercentage, classDataForGrading);
      doc.text(`Overall Grade: ${overallGrading.grade}`, 20, finalY + 18);
      if (overallGrading.points !== null) {
        const totalPoints = results.reduce((s: number, r: any) => {
          const pct = r.percentage !== undefined && r.percentage !== null ? r.percentage : Math.round((r.marks / (r.out_of || 100)) * 100);
          return s + (is844 ? (gradeFromPercentage844(pct).points || 0) : (gradeFromPercentageCBE(pct, classDataForGrading).points || 0));
        }, 0);
        doc.text(`Total Points: ${totalPoints}`, 80, finalY + 18);
      }

      doc.setFont('helvetica', 'normal');
      doc.text('Class Teacher Signature: ___________________', 14, finalY + 35);
      doc.text('Principal Signature: ___________________', 120, finalY + 35);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('CBE-Analytics | Support: support@cbe-analytics.com', 105, 285, { align: 'center' });
      doc.save(`report_card_${selectedChild.first_name}_${term?.name}.pdf`);
      toast.success('Report card downloaded!');
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
    setGenerating(false);
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!selectedChild || !results.length) {
      toast.error('No results found for this term');
      return;
    }

    // Check if payment required
    if (schoolPayConfig?.parent_pay_enabled) {
      const paid = await checkPdfPaid(selectedChild.id);
      if (paid) {
        await doGeneratePDF();
        return;
      }
      // Need to pay
      setPaying(true);
      try {
        await loadPaystackScript();
        if (!window.PaystackPop) throw new Error('Paystack not loaded');

        const amount = schoolPayConfig.pdf_report_fee;
        const reference = `pdf_${selectedChild.id}_${Date.now()}`;

        const handler = window.PaystackPop.setup({
          key: schoolPayConfig.reseller_paystack_public_key!,
          email: user!.email,
          amount: amount * 100,
          currency: 'KES',
          ref: reference,
          metadata: {
            custom_fields: [
              { display_name: 'Student', variable_name: 'student', value: `${selectedChild.first_name} ${selectedChild.last_name}` },
              { display_name: 'Payment Type', variable_name: 'type', value: 'PDF Report Card' },
            ],
          },
          callback: async (response: any) => {
            const { error } = await supabaseUntyped.from('parent_payments').insert({
              parent_id: user!.id,
              parent_name: `${user!.firstName} ${user!.lastName}`,
              student_id: selectedChild.id,
              student_name: `${selectedChild.first_name} ${selectedChild.last_name}`,
              school_id: schoolPayConfig.school_id,
              reseller_id: schoolPayConfig.reseller_id,
              amount: amount,
              payment_type: 'pdf_report',
              status: 'success',
              paystack_reference: response.reference || reference,
            });
            if (error) {
              toast.error('Payment saved but failed to record: ' + error.message);
            } else {
              toast.success(`Payment of KES ${amount} successful! Generating PDF...`);
              setPdfPaid(prev => ({ ...prev, [selectedChild.id]: true }));
              await doGeneratePDF();
            }
            setPaying(false);
          },
          onClose: () => {
            toast.info('Payment cancelled');
            setPaying(false);
          },
        });
        handler.openIframe();
      } catch (err: any) {
        toast.error(err.message || 'Payment failed');
        setPaying(false);
      }
    } else {
      // Free download
      await doGeneratePDF();
    }
  }, [selectedChild, results, schoolPayConfig, user, pdfPaid, selectedTerm, terms, schoolName]);

  const isPdfPaid = selectedChild ? !!pdfPaid[selectedChild.id] : false;
  const requiresPayment = !!(schoolPayConfig?.parent_pay_enabled && !isPdfPaid);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111111]">Child Report Card</h1>
        <p className="text-sm text-[#666666]">Download your child&apos;s academic report card</p>
      </div>
      {children.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[#666666]">No children linked to your account. Please contact the school administrator.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
            <h3 className="font-semibold text-[#111111] mb-4">Select Child &amp; Term</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Child</label>
                <select
                  value={selectedChild?.id || ''}
                  onChange={e => {
                    const child = children.find(c => c.id === e.target.value);
                    setSelectedChild(child);
                    if (child) {
                      setStudentCurriculum((child as any)?.curriculum === '844' ? '844' : 'CBE');
                      fetchTerms(child.school_id);
                      fetchSchoolPayConfig(child.school_id);
                      fetchSchoolName(child.school_id);
                    }
                  }}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
                >
                  {children.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name} - {c.classes?.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Term</label>
                <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white">
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>)}
                </select>
              </div>
            </div>
          </div>
          {results.length > 0 ? (
            <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#111111]">{selectedChild?.first_name}&apos;s Results ({results.length} subjects)</h3>
                <div className="flex gap-2 items-center">
                  {isPdfPaid && <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Paid</span>}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={generating || paying}
                    className="flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50"
                  >
                    {generating || paying ? <Loader2 className="w-4 h-4 animate-spin" /> : requiresPayment ? <Lock className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                    {generating ? 'Generating...' : paying ? 'Processing...' : requiresPayment ? `Pay KES ${schoolPayConfig?.pdf_report_fee || 50} & Download PDF` : 'Download PDF'}
                  </button>
                  <button
                    onClick={() => {
                      const term = terms.find((t: any) => t.id === selectedTerm);
                      const avg = results.length ? Math.round(results.reduce((s: number, r: any) => s + (r.percentage || r.marks || 0), 0) / results.length) : 0;
                      const text = encodeURIComponent(`${selectedChild?.first_name}'s CBE-Analytics Report Card\nTerm: ${term?.name || ''} ${term?.academic_year || ''}\nAverage: ${avg}%\nView at: ${window.location.origin}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                    }}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700"
                  >
                    <Share2 className="w-4 h-4" />
                    WhatsApp
                  </button>
                </div>
              </div>
              {requiresPayment && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-700 text-sm">
                  <CreditCard className="w-4 h-4 flex-shrink-0" />
                  <span>A one-time payment of <strong>KES {schoolPayConfig?.pdf_report_fee || 50}</strong> is required to download the PDF report card.</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Subject</th>
                      <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Marks</th>
                      <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">%</th>
                      <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">{studentCurriculum === '844' ? '8-4-4 Grade' : 'CBE Grade'}</th>
                      {!isPrimaryLevel(selectedChild?.classes?.level) && (
                        <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Points</th>
                      )}
                      <th className="text-left text-xs font-medium text-[#666666] uppercase py-2 px-3">Descriptor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => {
                      const pct = r.percentage !== undefined && r.percentage !== null ? r.percentage : Math.round((r.marks / (r.out_of || 100)) * 100);
                      const grading = studentCurriculum === '844' ? gradeFromPercentage844(pct) : gradeFromPercentageCBE(pct, selectedChild?.classes?.level);
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-3 font-medium">{r.subjects?.name}</td>
                          <td className="py-2 px-3">{r.marks}</td>
                          <td className="py-2 px-3">{pct}%</td>
                          <td className="py-2 px-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                              grading.grade.startsWith('EE') || grading.grade.startsWith('A') ? 'bg-green-100 text-green-700' :
                              grading.grade.startsWith('ME') || grading.grade.startsWith('B') || grading.grade.startsWith('C') ? 'bg-blue-100 text-blue-700' :
                              grading.grade.startsWith('AE') || grading.grade.startsWith('D') ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {grading.grade}
                            </span>
                          </td>
                          {!isPrimaryLevel(selectedChild?.classes?.level) && (
                            <td className="py-2 px-3">{grading.points ?? '—'}</td>
                          )}
                          <td className="py-2 px-3 text-xs text-gray-600">{grading.descriptor}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-[#666666]">No results found for this term.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
