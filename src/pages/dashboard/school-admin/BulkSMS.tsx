import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { supabaseUntyped } from '@/lib/supabase/client';
import { sendBulkSMS, SMS_TEMPLATES } from '@/lib/sms';
import {
  MessageSquare, Send, Users, CheckCircle, AlertCircle, Loader2,
  Filter, ChevronDown, UserCheck, Bell, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type SMSType = 'results' | 'custom' | 'announcement';
type Audience = 'parents_class' | 'parents_all' | 'teachers';

export default function BulkSMS() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [smsType, setSmsType] = useState<SMSType>('results');
  const [audience, setAudience] = useState<Audience>('parents_class');
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, total: 0 });
  const [summary, setSummary] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);
  const [preview, setPreview] = useState<Array<{ name: string; phone: string; message: string }>>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    fetchData();
  }, [user?.schoolId]);

  // When audience is teachers, results SMS doesn't apply
  useEffect(() => {
    if (audience === 'teachers' && smsType === 'results') {
      setSmsType('custom');
    }
  }, [audience, smsType]);

  const fetchData = async () => {
    if (!user?.schoolId) return;
    setLoading(true);
    try {
      const [{ data: c }, { data: t }, { data: school }, { data: teach }] = await Promise.all([
        supabase.from('classes').select('*').eq('school_id', user.schoolId).order('name'),
        supabase.from('terms').select('*').eq('school_id', user.schoolId).order('academic_year', { ascending: false }),
        supabaseUntyped.from('schools').select('name').eq('id', user.schoolId).maybeSingle(),
        supabaseUntyped.from('teachers').select('id, first_name, last_name, phone').eq('school_id', user.schoolId).eq('is_active', true),
      ]);
      setClasses(c || []);
      setTerms(t || []);
      setSchoolName(school?.name || '');
      setTeachers(teach || []);
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (audience === 'teachers') {
      setStudents([]);
      return;
    }
    if (!user?.schoolId) return;

    const load = async () => {
      let q = supabaseUntyped
        .from('students')
        .select('id, first_name, last_name, admission_number, parent_name, parent_phone, class_id')
        .eq('school_id', user.schoolId)
        .eq('is_active', true)
        .order('first_name');
      if (audience === 'parents_class' && selectedClass) {
        q = q.eq('class_id', selectedClass);
      }
      const { data } = await q;
      setStudents(data || []);
    };
    load();
  }, [selectedClass, audience, user?.schoolId]);

  const recipientCount = audience === 'teachers'
    ? teachers.filter((t: any) => t.phone && String(t.phone).length >= 9).length
    : students.filter((s: any) => s.parent_phone && String(s.parent_phone).length >= 9).length;

  const buildResultsMessages = async (): Promise<Array<{ name: string; phone: string; message: string }>> => {
    if (!selectedTerm) {
      toast.error('Please select a term');
      return [];
    }

    const targetClassIds = selectedClass
      ? [selectedClass]
      : classes.map((c) => c.id);

    if (targetClassIds.length === 0) {
      toast.error('No classes found');
      return [];
    }

    const { data: results } = await supabaseUntyped
      .from('results')
      .select('student_id, subject_id, percentage, cbc_grade, cbc_sublevel, position, class_position, subjects(name)')
      .in('class_id', targetClassIds)
      .eq('term_id', selectedTerm);

    if (!results || results.length === 0) {
      toast.error('No results found for the selected criteria');
      return [];
    }

    const studentResults: Record<string, any[]> = {};
    results.forEach((r: any) => {
      if (!studentResults[r.student_id]) studentResults[r.student_id] = [];
      studentResults[r.student_id].push(r);
    });

    const messages: Array<{ name: string; phone: string; message: string }> = [];

    for (const student of students) {
      if (!student.parent_phone) continue;
      const studentRes = studentResults[student.id] || [];
      if (studentRes.length === 0) continue;

      const avgPct = studentRes.reduce((s: number, r: any) => s + (r.percentage || 0), 0) / studentRes.length;
      const position = studentRes[0]?.class_position || studentRes[0]?.position;
      const className = classes.find((c) => c.id === student.class_id)?.name || '';

      const message = SMS_TEMPLATES.resultsToParent(
        `${student.first_name} ${student.last_name}`,
        className,
        studentRes.map((r: any) => ({
          name: r.subjects?.name || 'Subject',
          marks: r.percentage || 0,
          grade: r.cbc_grade || r.cbc_sublevel || '-',
        })),
        Math.round(avgPct),
        100,
        position || 0,
        students.length,
        ''
      );

      messages.push({
        name: `${student.first_name} ${student.last_name}`,
        phone: student.parent_phone,
        message,
      });
    }

    return messages;
  };

  const buildCustomMessages = (): Array<{ name: string; phone: string; message: string }> => {
    if (!customMessage.trim()) {
      toast.error('Please enter a message');
      return [];
    }

    if (audience === 'teachers') {
      return teachers
        .filter((t: any) => t.phone && String(t.phone).length >= 9)
        .map((t: any) => ({
          name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Teacher',
          phone: t.phone,
          message: customMessage
            .replace('{name}', `${t.first_name || ''} ${t.last_name || ''}`.trim())
            .replace('{adm}', ''),
        }));
    }

    return students
      .filter((s: any) => s.parent_phone)
      .map((s: any) => ({
        name: `${s.first_name} ${s.last_name}`,
        phone: s.parent_phone,
        message: SMS_TEMPLATES.customMessage
          ? SMS_TEMPLATES.customMessage(
              customMessage
                .replace('{name}', `${s.first_name} ${s.last_name}`)
                .replace('{adm}', s.admission_number || '')
            )
          : customMessage
              .replace('{name}', `${s.first_name} ${s.last_name}`)
              .replace('{adm}', s.admission_number || ''),
      }));
  };

  const buildAnnouncementMessages = (): Array<{ name: string; phone: string; message: string }> => {
    if (!customMessage.trim()) {
      toast.error('Please enter an announcement message');
      return [];
    }

    const body = SMS_TEMPLATES.announcement
      ? SMS_TEMPLATES.announcement(schoolName || 'School', customMessage)
      : `${schoolName || 'School'}: ${customMessage}`;

    if (audience === 'teachers') {
      return teachers
        .filter((t: any) => t.phone && String(t.phone).length >= 9)
        .map((t: any) => ({
          name: `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Teacher',
          phone: t.phone,
          message: body,
        }));
    }

    return students
      .filter((s: any) => s.parent_phone)
      .map((s: any) => ({
        name: `${s.first_name} ${s.last_name}`,
        phone: s.parent_phone,
        message: body,
      }));
  };

  const handlePreview = async () => {
    if (audience === 'parents_class' && !selectedClass && smsType !== 'results') {
      // allow all parents via parents_all; for class audience require class
    }
    if (audience === 'parents_class' && !selectedClass) {
      toast.error('Please select a class, or choose All Parents');
      return;
    }

    let messages: Array<{ name: string; phone: string; message: string }> = [];
    if (smsType === 'results') {
      messages = await buildResultsMessages();
    } else if (smsType === 'announcement') {
      messages = buildAnnouncementMessages();
    } else {
      messages = buildCustomMessages();
    }
    if (messages.length === 0) return;
    setPreview(messages);
    setShowPreview(true);
  };

  const handleSend = async () => {
    if (preview.length === 0) {
      toast.error('Please preview messages first');
      return;
    }

    setSending(true);
    setSummary(null);
    setProgress({ sent: 0, total: preview.length });

    try {
      // Prefer per-message send when messages differ (results / personalized)
      const uniqueBodies = new Set(preview.map((p) => p.message));
      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      if (uniqueBodies.size === 1) {
        const recipients = preview.map((p) => p.phone).filter((phone) => !!phone && phone.length > 0);
        const message = preview[0]?.message || '';
        const result = await sendBulkSMS(recipients, message);
        const sentMatch = result.message?.match(/Sent:\s*(\d+)/);
        const failedMatch = result.message?.match(/Failed:\s*(\d+)/);
        sentCount = sentMatch ? parseInt(sentMatch[1]) : result.success ? recipients.length : 0;
        failedCount = failedMatch ? parseInt(failedMatch[1]) : result.success ? 0 : recipients.length;
        if (!result.success && result.error) errors.push(result.error);
      } else {
        // Personalized messages — send one-by-one / small batches
        for (let i = 0; i < preview.length; i++) {
          const item = preview[i];
          const result = await sendBulkSMS([item.phone], item.message);
          if (result.success) sentCount += 1;
          else {
            failedCount += 1;
            if (result.error) errors.push(`${item.name}: ${result.error}`);
          }
          setProgress({ sent: sentCount + failedCount, total: preview.length });
        }
      }

      setSummary({ sent: sentCount, failed: failedCount, errors });
      setProgress({ sent: sentCount + failedCount, total: preview.length });

      if (sentCount > 0) toast.success(`${sentCount} SMS messages sent successfully!`);
      if (failedCount > 0) toast.warning(`${failedCount} messages failed to send.`);
    } catch (err: any) {
      toast.error('Bulk SMS failed: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-sm text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#111111]">Communicate & Bulk SMS</h1>
          <p className="text-sm text-[#666666]">
            Send results, announcements, and messages to parents or teachers — one place for all school SMS.
          </p>
        </div>
        <Link
          to="/school-admin/sms-settings"
          className="inline-flex items-center gap-2 text-sm text-[#2563EB] hover:underline"
        >
          <Settings className="w-4 h-4" /> SMS Settings
        </Link>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 text-sm text-green-800">
        <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-600" />
        <div>
          <p className="font-bold">SMS Ready</p>
          <p>Results SMS, custom messages, announcements, and teacher messaging are combined here.</p>
        </div>
      </div>

      {/* Audience */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4">Send To</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'parents_class', label: 'Class Parents', desc: 'Parents in one class', icon: Users },
            { key: 'parents_all', label: 'All Parents', desc: 'Every parent in school', icon: Bell },
            { key: 'teachers', label: 'All Teachers', desc: 'Staff with phone numbers', icon: UserCheck },
          ].map(({ key, label, desc, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                setAudience(key as Audience);
                setPreview([]);
                setShowPreview(false);
                if (key !== 'parents_class') setSelectedClass('');
              }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                audience === key ? 'border-[#2563EB] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${audience === key ? 'text-[#2563EB]' : 'text-gray-500'}`} />
              <div className="font-semibold text-sm text-[#111111]">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* SMS Type */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4">Message Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { key: 'results', label: 'Results SMS', desc: 'Term results to parents', icon: '📊', parentsOnly: true },
            { key: 'custom', label: 'Custom Message', desc: 'Personalized or free text', icon: '✉️' },
            { key: 'announcement', label: 'Announcement', desc: 'School-wide notice', icon: '📢' },
          ]
            .filter((x) => !(x.parentsOnly && audience === 'teachers'))
            .map(({ key, label, desc, icon }) => (
              <button
                key={key}
                onClick={() => {
                  setSmsType(key as SMSType);
                  setPreview([]);
                  setShowPreview(false);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  smsType === key ? 'border-[#2563EB] bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold text-sm text-[#111111]">{label}</div>
                <div className="text-xs text-gray-500 mt-1">{desc}</div>
              </button>
            ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <h2 className="text-lg font-bold text-[#111111] mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-[#2563EB]" /> Recipients
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audience === 'parents_class' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Class *</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              >
                <option value="">Select class</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.stream ? ` (${c.stream})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          {smsType === 'results' && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Term *</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] bg-white"
              >
                <option value="">Select Term</option>
                {terms.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.academic_year}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="text-xs text-green-600 mt-3">
          <Users className="w-3 h-3 inline mr-1" />
          {recipientCount} recipient{recipientCount === 1 ? '' : 's'} with phone numbers
          {audience === 'parents_class' && selectedClass ? ' in selected class' : ''}
          {audience === 'parents_all' ? ' (all parents)' : ''}
          {audience === 'teachers' ? ' (teachers)' : ''}
        </p>
      </div>

      {(smsType === 'custom' || smsType === 'announcement') && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <h2 className="text-lg font-bold text-[#111111] mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#2563EB]" />{' '}
            {smsType === 'announcement' ? 'Announcement' : 'Message'}
          </h2>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder={
              smsType === 'announcement'
                ? 'Type your announcement here...'
                : audience === 'teachers'
                ? 'Type your message to teachers. Use {name} for teacher name.'
                : 'Type your message. Use {name} for student name and {adm} for admission number.'
            }
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Characters: {customMessage.length} | SMS parts: {Math.max(1, Math.ceil(customMessage.length / 160))}
            </p>
            {smsType === 'custom' && (
              <p className="text-xs text-gray-400">Tip: placeholders {'{name}'} {audience !== 'teachers' ? 'and {adm}' : ''}</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handlePreview}
          disabled={sending}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
          Preview Messages
        </button>
        <button
          onClick={handleSend}
          disabled={sending || preview.length === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending
            ? `Sending... (${progress.sent}/${progress.total})`
            : `Send ${preview.length > 0 ? `(${preview.length})` : ''} SMS`}
        </button>
      </div>

      {sending && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">Sending SMS messages...</span>
            <span className="text-sm text-blue-700">
              {progress.sent}/{progress.total}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress.total > 0 ? (progress.sent / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {summary && (
        <div
          className={`rounded-2xl p-4 border ${
            summary.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            {summary.failed === 0 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            )}
            <span className="font-bold text-sm">
              {summary.sent} sent, {summary.failed} failed
            </span>
          </div>
          {summary.errors.length > 0 && (
            <details className="text-xs text-red-600 mt-2">
              <summary className="cursor-pointer font-medium">View errors ({summary.errors.length})</summary>
              <ul className="mt-1 space-y-0.5">
                {summary.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {showPreview && preview.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#111111]">Message Preview ({preview.length})</h2>
            <button onClick={() => setShowPreview(false)} className="text-xs text-gray-500 hover:text-gray-700">
              Hide
            </button>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Message</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-gray-600">{p.phone}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-xs truncate" title={p.message}>
                      {p.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
