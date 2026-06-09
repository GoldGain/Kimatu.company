import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { createScopedUser } from '@/lib/supabase/createUser';
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { Reseller } from '@/types/database';

const DEFAULT_RESELLER_PASSWORD = '123456789';

interface ResellerForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  paystack_public_key: string;
  paystack_secret_key: string;
  parent_pay_enabled: boolean;
  view_results_fee: number;
  pdf_report_fee: number;
}

const defaultForm: ResellerForm = {
  name: '',
  email: '',
  password: DEFAULT_RESELLER_PASSWORD,
  phone: '',
  paystack_public_key: '',
  paystack_secret_key: '',
  parent_pay_enabled: false,
  view_results_fee: 50,
  pdf_report_fee: 50,
};

export default function MasterAdminResellers() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ResellerForm>(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('resellers').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load resellers');
    setResellers((data || []) as Reseller[]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('resellers').update({
          name: form.name,
          email: form.email,
          phone: form.phone,
          paystack_public_key: form.paystack_public_key || null,
          paystack_secret_key: form.paystack_secret_key || null,
          parent_pay_enabled: form.parent_pay_enabled,
          view_results_fee: form.view_results_fee,
          pdf_report_fee: form.pdf_report_fee,
        }).eq('id', editingId);
        if (error) throw error;
        toast.success('Reseller updated');
      } else {
        // Create auth user using RPC (reliable, uses service role)
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_auth_user', {
          p_email: form.email,
          p_password: DEFAULT_RESELLER_PASSWORD,
          p_first_name: form.name.split(' ')[0],
          p_last_name: form.name.split(' ').slice(1).join(' ') || '',
          p_role: 'reseller_super_admin'
        });

        if (rpcError) throw rpcError;
        
        const userId = rpcData.user_id;
        const { error: rErr } = await supabase.from('resellers').insert({
          user_id: userId,
          name: form.name,
          email: form.email,
          phone: form.phone,
          paystack_public_key: form.paystack_public_key || null,
          paystack_secret_key: form.paystack_secret_key || null,
          parent_pay_enabled: form.parent_pay_enabled,
          view_results_fee: form.view_results_fee,
          pdf_report_fee: form.pdf_report_fee,
        });
        if (rErr) throw rErr;
        
        toast.success(`✅ Reseller created! Login: ${form.email} | Password: ${DEFAULT_RESELLER_PASSWORD}`);
      }
      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm);
      fetchResellers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save reseller');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r: Reseller) => {
    setForm({
      name: r.name,
      email: r.email,
      password: DEFAULT_RESELLER_PASSWORD,
      phone: r.phone || '',
      paystack_public_key: r.paystack_public_key || '',
      paystack_secret_key: r.paystack_secret_key || '',
      parent_pay_enabled: r.parent_pay_enabled,
      view_results_fee: r.view_results_fee,
      pdf_report_fee: r.pdf_report_fee,
    });
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleToggleStatus = async (r: Reseller) => {
    const newStatus = r.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('resellers').update({ status: newStatus }).eq('id', r.id);
    if (error) toast.error('Failed to update status');
    else { toast.success(`Reseller ${newStatus}`); fetchResellers(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this reseller? This cannot be undone.')) return;
    const { error } = await supabase.from('resellers').delete().eq('id', id);
    if (error) toast.error('Failed to delete reseller');
    else { toast.success('Reseller deleted'); fetchResellers(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reseller Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all reseller super admins</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchResellers} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
            <Plus className="w-4 h-4" /> Add Reseller
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Reseller' : 'Add New Reseller'}</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Password</label>
                <input disabled type="text" value={DEFAULT_RESELLER_PASSWORD}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-gray-500 mt-1">Auto-assigned password for new resellers</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.parent_pay_enabled} onChange={e => setForm({...form, parent_pay_enabled: e.target.checked})}
                  className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Enable Parent-Pay</span>
              </label>
            </div>
            {form.parent_pay_enabled && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paystack Public Key</label>
                  <input value={form.paystack_public_key} onChange={e => setForm({...form, paystack_public_key: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="pk_live_..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paystack Secret Key</label>
                  <input type="password" value={form.paystack_secret_key} onChange={e => setForm({...form, paystack_secret_key: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="sk_live_..." />
                </div>
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
            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Resellers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : resellers.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No resellers yet. Add one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Schools</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3">Parent-Pay</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {resellers.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.email}</td>
                    <td className="px-4 py-3 text-gray-600">{r.phone || '—'}</td>
                    <td className="px-4 py-3">{r.total_schools}</td>
                    <td className="px-4 py-3">{r.total_students}</td>
                    <td className="px-4 py-3">KES {r.total_revenue?.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.parent_pay_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.parent_pay_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(r)} title="Edit" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleToggleStatus(r)} title={r.status === 'active' ? 'Suspend' : 'Activate'} className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600">
                          {r.status === 'active' ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(r.id)} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
