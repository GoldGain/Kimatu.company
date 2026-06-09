import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

interface SchoolForm {
  name: string;
  code: string;
  county: string;
  curriculum: string;
  principal_name: string;
  phone: string;
  email: string;
  parent_pay_enabled: boolean;
  view_results_fee: number;
  pdf_report_fee: number;
}

const defaultForm: SchoolForm = {
      name: '', code: '', county: '', curriculum: 'CBE',
  principal_name: '', phone: '', email: '',
  parent_pay_enabled: false, view_results_fee: 50, pdf_report_fee: 50,
};

export default function ResellerSchools() {
  const { user } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resellerId, setResellerId] = useState<string | null>(null);
  const [resellerPayEnabled, setResellerPayEnabled] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SchoolForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: resellerData } = await supabase
      .from('resellers').select('id, parent_pay_enabled').eq('user_id', user!.id).maybeSingle();
    
    if (resellerData) {
      setResellerId(resellerData.id);
      setResellerPayEnabled(resellerData.parent_pay_enabled);
      const { data: schoolsData } = await supabase
        .from('schools').select('*').eq('reseller_id', resellerData.id).order('created_at', { ascending: false });
      setSchools(schoolsData || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resellerId) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        county: form.county,
        curriculum: form.curriculum,
        principal_name: form.principal_name,
        phone: form.phone,
        email: form.email,
        reseller_id: resellerId,
        parent_pay_enabled: resellerPayEnabled ? form.parent_pay_enabled : false,
        view_results_fee: form.view_results_fee,
        pdf_report_fee: form.pdf_report_fee,
        status: 'active',
        subscription_plan: 'basic',
      };
      if (editingId) {
        const { error } = await supabase.from('schools').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('School updated');
      } else {
        const { error } = await supabase.from('schools').insert(payload);
        if (error) throw error;
        toast.success('School created');
      }
      setShowForm(false); setEditingId(null); setForm(defaultForm);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save school');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: any) => {
    setForm({
      name: s.name, code: s.code, county: s.county || '', curriculum: (Array.isArray(s.curriculum) ? s.curriculum[0] : s.curriculum) || 'CBE',
      principal_name: s.principal_name || '', phone: s.phone || '', email: s.email || '',
      parent_pay_enabled: s.parent_pay_enabled || false,
      view_results_fee: s.view_results_fee || 50,
      pdf_report_fee: s.pdf_report_fee || 50,
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schools</h1>
          <p className="text-gray-500 text-sm mt-1">Manage schools under your reseller account</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" /> Add School
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit School' : 'Add New School'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Code *</label>
              <input required value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input value={form.county} onChange={e => setForm({...form, county: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum</label>
              <select value={form.curriculum} onChange={e => setForm({...form, curriculum: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="CBE">CBE (Competency Based Education)</option>
                <option value="844">8-4-4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
              <input value={form.principal_name} onChange={e => setForm({...form, principal_name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Parent-Pay settings (only if reseller has it enabled) */}
            {resellerPayEnabled && (
              <>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.parent_pay_enabled} onChange={e => setForm({...form, parent_pay_enabled: e.target.checked})}
                      className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Enable Parent-Pay for this school</span>
                  </label>
                </div>
                {form.parent_pay_enabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">View Results Fee (KES)</label>
                      <input type="number" value={form.view_results_fee} onChange={e => setForm({...form, view_results_fee: parseInt(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PDF Report Fee (KES)</label>
                      <input type="number" value={form.pdf_report_fee} onChange={e => setForm({...form, pdf_report_fee: parseInt(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schools Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No schools yet. Add your first school.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">School Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Curriculum</th>
                  <th className="px-4 py-3">County</th>
                  <th className="px-4 py-3">Parent-Pay</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s.code}</td>
                    <td className="px-4 py-3">{s.curriculum === 'CBE' || s.curriculum === 'CBC' ? 'CBE' : (s.curriculum || 'CBE')}</td>
                    <td className="px-4 py-3">{s.county || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.parent_pay_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {s.parent_pay_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleEdit(s)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
