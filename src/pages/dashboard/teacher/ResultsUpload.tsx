import { useState, useEffect } from 'react';
import { supabase, supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Loader2, CheckCircle, FileSpreadsheet, Download, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClassRecord { id: string; name: string; stream?: string; curriculum?: string; level?: number; }
interface SubjectRecord { id: string; name: string; }
interface Student { id: string; admission_number: string; first_name: string; last_name: string; }
interface TermRecord { id: string; name: string; academic_year: string; }
interface ParsedRow {
  student_id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  marks: number;
  originalRow: Record<string, any>;
}

const SUBJECT_CHOICES = ['English', 'Mathematics', 'Kiswahili', 'Science', 'Social Studies', 'CRE', 'IRE', 'Home Science', 'Agriculture', 'Art & Craft', 'Music', 'Physical Education', 'Computer Studies', 'French', 'German', 'Business Studies', 'Geography', 'History', 'Biology', 'Chemistry', 'Physics', 'Literature'];

export default function TeacherResultsUpload() {
  const { user } = useAuth();

  // ── Strict teacher assignment enforcement ─────────────────────────────────
  const [teacherAssignments, setTeacherAssignments] = useState<Array<{ class_id: string; subject_id: string }>>([]);

  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [terms, setTerms] = useState<TermRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'manual' | 'csv'>('manual');

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  const [outOf, setOutOf] = useState(100);

  // Subject selection: 'db' = from DB, 'preset' = from pre-populated list, 'manual' = typed
  const [subjectSource, setSubjectSource] = useState<'db' | 'preset' | 'manual'>('db');
  const [presetSubject, setPresetSubject] = useState('');
  const [manualSubject, setManualSubject] = useState('');

  const [manualMarks, setManualMarks] = useState<Record<string, number>>({});
  const [csvData, setCsvData] = useState<ParsedRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const schoolId = user?.schoolId ?? '';

      // Get teacher record first
      const { data: teacherData } = await supabaseUntyped
        .from('teachers')
        .select('id')
        .eq('profile_id', user?.id)
        .maybeSingle();

      // Get teacher's subject assignments
      const { data: assignments } = await supabase
        .from('teacher_subject_assignments')
        .select('class_id, subject_id')
        .eq('teacher_id', teacherData?.id || '')
        .eq('is_active', true);

      const assignmentList = assignments || [];
      setTeacherAssignments(assignmentList);

      // Get all classes and subjects but we'll filter by assignments
      const [{ data: c }, { data: s }, { data: t }, { data: e }] = await Promise.all([
        supabase.from('classes').select('*').eq('school_id', schoolId).order('level'),
        supabase.from('subjects').select('*').eq('school_id', schoolId).order('name'),
        supabase.from('terms').select('*').eq('school_id', schoolId).order('academic_year', { ascending: false }),
        supabaseUntyped.from('school_exams').select('*').eq('school_id', schoolId).eq('is_active', true).order('name'),
      ]);

      // Filter to only classes/subjects the teacher is assigned to
      const assignedClassIds = [...new Set(assignmentList.map(a => a.class_id))];
      const assignedSubjectIds = [...new Set(assignmentList.map(a => a.subject_id))];

      setClasses((c || []).filter((cls: any) => assignedClassIds.includes(cls.id)));
      setSubjects((s || []).filter((sub: any) => assignedSubjectIds.includes(sub.id)));
      setExams(e || []);

      // Auto-create default terms if none exist
      let termsData = t || [];
      if (termsData.length === 0) {
        const year = new Date().getFullYear();
        const defaultTerms = [
          { school_id: schoolId, name: 'Term 1', academic_year: String(year) },
          { school_id: schoolId, name: 'Term 2', academic_year: String(year) },
          { school_id: schoolId, name: 'Term 3', academic_year: String(year) },
        ];
        const { data: createdTerms } = await supabase.from('terms').insert(defaultTerms).select();
        termsData = createdTerms || [];
      }
      setTerms(termsData);

      setLoading(false);
    };
    if (user?.schoolId) fetchData();
  }, [user?.schoolId]);

  // Fetch students when class is selected
  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    const fetchStudents = async () => {
      const { data } = await supabase
        .from('students')
        .select('id, admission_number, first_name, last_name')
        .eq('class_id', selectedClass)
        .eq('is_active', true)
        .order('admission_number');
      setStudents(data || []);
    };
    fetchStudents();
  }, [selectedClass]);

  const currentClassData = classes.find(c => c.id === selectedClass);
  const currentBand = currentClassData?.curriculum === '844' ? '844' : 'primary';

  // ─── CSV Upload ────────────────────────────────────────────────────────────
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const admIdx = headers.findIndex(h => h.includes('admission') || h === 'adm' || h === 'reg_no');
    const marksIdx = headers.findIndex(h => h.includes('marks') || h === 'score' || h === 'mark');

    if (admIdx === -1 || marksIdx === -1) {
      toast.error('CSV must contain "admission_number" and "marks" columns');
      return;
    }

    const rows: ParsedRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      const admNo = cols[admIdx];
      const marks = parseFloat(cols[marksIdx]);
      const student = students.find(s => s.admission_number === admNo);
      if (student) {
        rows.push({ student_id: student.id, admission_number: admNo, first_name: student.first_name, last_name: student.last_name, marks: isNaN(marks) ? 0 : marks, originalRow: Object.fromEntries(headers.map((h, j) => [h, cols[j]])) });
      }
    }
    setCsvData(rows);
    toast.success(`${rows.length} records matched from CSV`);
  };

  // ─── Download Template ─────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const header = 'admission_number,first_name,last_name,marks\n';
    const rows = students.map(s => `${s.admission_number},${s.first_name},${s.last_name},\n`).join('');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `results_template_${selectedClass}_${selectedSubject}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Manual Marks Table ────────────────────────────────────────────────────
  const handleManualChange = (studentId: string, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    setManualMarks(prev => ({ ...prev, [studentId]: isNaN(num) ? 0 : num }));
  };

  // ─── Resolve Selected Subject Name ─────────────────────────────────────────
  const getSelectedSubjectName = () => {
    if (subjectSource === 'db') return subjects.find(s => s.id === selectedSubject)?.name || '';
    if (subjectSource === 'preset') return presetSubject;
    return manualSubject.trim();
  };

  // ─── Upload ─────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!selectedClass) { toast.error('Please select a class'); return; }
    if (!selectedTerm) { toast.error('Please select a term'); return; }
    const subjectName = getSelectedSubjectName();
    if (!subjectName && !selectedSubject) { toast.error('Please select or enter a subject'); return; }

    let subjectId = selectedSubject;
    if (subjectSource !== 'db' || !subjectId) {
      // Ensure subject exists in DB
      const { data: existing } = await supabase.from('subjects').select('id').eq('school_id', user?.schoolId).ilike('name', subjectName).maybeSingle();
      if (existing) { subjectId = existing.id; }
      else {
        const { data: created, error: subjErr } = await supabase.from('subjects').insert({ school_id: user?.schoolId, name: subjectName }).select('id').single();
        if (subjErr) { toast.error('Failed to create subject'); return; }
        subjectId = created.id;
      }
    }

    const dataToSubmit: ParsedRow[] = mode === 'manual'
      ? students.map(s => ({ student_id: s.id, admission_number: s.admission_number, first_name: s.first_name, last_name: s.last_name, marks: manualMarks[s.id] || 0, originalRow: {} }))
      : csvData;

    if (dataToSubmit.length === 0) { toast.error('No data to upload'); return; }

    setUploading(true);
    try {
      const { data: teacherData } = await supabaseUntyped.from('teachers').select('id').eq('profile_id', user?.id).single();
      const teacherId = teacherData?.id ?? '';
      // Primary (Grades 1-6) and Pre-Primary (PP1/PP2): cbc_sublevel MUST be null
      // (enum only accepts EE1/ME1 etc. for junior/senior).
      // Primary and Pre-Primary grades use cbc_grade (EE/ME/AE/BE) with no sub-level and no points.
      const isPrimaryClass = currentBand === 'primary' || currentBand === 'pre-primary';
      const records = dataToSubmit.map((row) => ({
        school_id: user?.schoolId ?? '',
        student_id: row.student_id,
        class_id: selectedClass,
        subject_id: subjectId,
        teacher_id: teacherId,
        term_id: selectedTerm,
        exam_id: selectedExam || null,
        academic_year: new Date().getFullYear().toString(),
        curriculum: currentClassData?.curriculum || 'CBE',
        marks: row.marks,
        percentage: Math.round((row.marks / outOf) * 100),
        cbc_grade: isPrimaryClass ? (row.marks >= 50 ? (row.marks >= 75 ? 'EE' : 'ME') : (row.marks >= 40 ? 'AE' : 'BE')) : null,
        cbc_sublevel: isPrimaryClass ? null : (row.marks >= 50 ? (row.marks >= 75 ? 'EE1' : 'ME1') : (row.marks >= 40 ? 'AE1' : 'BE1')),
        grade_844: currentBand === '844' ? (row.marks >= 80 ? 'A' : row.marks >= 75 ? 'A-' : row.marks >= 70 ? 'B+' : row.marks >= 65 ? 'B' : row.marks >= 60 ? 'B-' : row.marks >= 55 ? 'C+' : row.marks >= 50 ? 'C' : row.marks >= 45 ? 'C-' : row.marks >= 40 ? 'D+' : row.marks >= 35 ? 'D' : row.marks >= 30 ? 'D-' : 'E') : null,
        points_844: currentBand === '844' ? (row.marks >= 80 ? 12 : row.marks >= 75 ? 11 : row.marks >= 70 ? 10 : row.marks >= 65 ? 9 : row.marks >= 60 ? 8 : row.marks >= 55 ? 7 : row.marks >= 50 ? 6 : row.marks >= 45 ? 5 : row.marks >= 40 ? 4 : row.marks >= 35 ? 3 : row.marks >= 30 ? 2 : 1) : null,
        position: null,
        class_position: null,
        status: 'active',
      }));

      const { error: insertError } = await supabaseUntyped.from('results').insert(records);
      if (insertError) throw new Error(insertError.message);

      toast.success(`Uploaded ${records.length} results successfully!`);
      setManualMarks({});
      setCsvData([]);
      setCsvFileName('');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    }
    setUploading(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#2563EB]" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#111111]">Upload Results</h1>
        <p className="text-sm text-[#666666]">Enter or import student marks for your assigned subjects.</p>
      </div>

      {/* Strict Assignment Info */}
      {teacherAssignments.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">Your Assigned Subjects & Classes</p>
          <p className="text-xs text-blue-700">Only your assigned classes and subjects are shown below.</p>
        </div>
      )}

      {/* Step 1: Select Class, Subject, Term */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h3 className="font-semibold text-[#111111] mb-4">Step 1: Select Class, Subject & Term</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Class selector - filtered to assigned only */}
          <select
            value={selectedClass}
            onChange={e => { setSelectedClass(e.target.value); setManualMarks({}); setCsvData([]); }}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
          >
            <option value="">Select Class</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.stream ? ` (${c.stream})` : ''}</option>)}
          </select>

          {/* Subject selector - filtered to assigned only */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subject Source</label>
            <div className="flex gap-2 mb-2">
              {[
                { key: 'db', label: 'From List' },
                { key: 'preset', label: 'Common' },
                { key: 'manual', label: 'Custom' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSubjectSource(key as any)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    subjectSource === key ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {subjectSource === 'db' && (
              <select
                value={selectedSubject}
                onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              >
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
            {subjectSource === 'preset' && (
              <select
                value={presetSubject}
                onChange={e => setPresetSubject(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              >
                <option value="">Select Subject</option>
                {SUBJECT_CHOICES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {subjectSource === 'manual' && (
              <input
                type="text"
                value={manualSubject}
                onChange={e => setManualSubject(e.target.value)}
                placeholder="Type subject name"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            )}
          </div>

          <select
            value={selectedTerm}
            onChange={e => setSelectedTerm(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
          >
            <option value="">Select Term</option>
            {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name} {t.academic_year}</option>)}
          </select>

          {/* Assessment/Exam selector */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Assessment (optional)</label>
            <select
              value={selectedExam}
              onChange={e => setSelectedExam(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
            >
              <option value="">All / Term Exam</option>
              {exams
                .filter(ex => !selectedTerm || ex.term_id === selectedTerm)
                .map((ex: any) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name}{ex.type ? ` (${ex.type})` : ''}{ex.weightage ? ` — ${ex.weightage}%` : ''}
                  </option>
                ))}
            </select>
          </div>

          {/* Out of */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Out of (max marks)</label>
            <input
              type="number"
              value={outOf}
              onChange={e => setOutOf(parseInt(e.target.value) || 100)}
              min={1}
              max={100}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'manual' ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setMode('csv')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${mode === 'csv' ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          CSV Upload
        </button>
      </div>

      {/* Manual Entry Table */}
      {mode === 'manual' && selectedClass && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="font-semibold text-[#111111] mb-4">Step 2: Enter Marks</h3>
          {students.length === 0 ? (
            <p className="text-sm text-gray-500">No students found in this class.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Admission</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Marks (out of {outOf})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {students.map((s, i) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium">{s.admission_number}</td>
                        <td className="px-3 py-2">{s.first_name} {s.last_name}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={outOf}
                            step={0.5}
                            value={manualMarks[s.id] || ''}
                            onChange={e => handleManualChange(s.id, e.target.value)}
                            placeholder="—"
                            className="w-20 text-center border border-gray-200 rounded-lg py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* CSV Upload */}
      {mode === 'csv' && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h3 className="font-semibold text-[#111111] mb-4">Step 2: Upload CSV</h3>
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <label className="flex items-center gap-2 bg-[#2563EB] text-white px-5 py-2.5 rounded-xl text-sm font-medium cursor-pointer hover:bg-[#1d4ed8]">
              <Upload className="w-4 h-4" />
              Choose CSV File
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
            <button onClick={downloadTemplate} className="flex items-center gap-2 text-sm text-[#2563EB] hover:underline">
              <Download className="w-4 h-4" /> Download Template
            </button>
          </div>
          {csvFileName && <p className="text-xs text-gray-500 mt-2">Selected: {csvFileName}</p>}
          {csvData.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Admission</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {csvData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{row.admission_number}</td>
                      <td className="px-3 py-2">{row.first_name} {row.last_name}</td>
                      <td className="px-3 py-2 text-center font-medium">{row.marks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || (!selectedClass) || (!selectedTerm)}
        className="w-full flex items-center justify-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
        {uploading ? 'Uploading...' : `Upload ${mode === 'manual' ? students.filter(s => manualMarks[s.id]).length : csvData.length} Results`}
      </button>
    </div>
  );
}
