import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Edit, RefreshCw, Lock, Unlock, DollarSign, X, AlertTriangle } from 'lucide-react';
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

interface PricingForm {
  plan_name: string;
  one_time_fee: number;
  annual_per_learner: number;
  termly_per_learner: number;
  flat_annual: number;
  flat_termly: number;
  discount_percent: number;
  notes: string;
}

const defaultForm: SchoolForm = {
  name: '', code: '', county: '', curriculum: 'CBE',
  principal_name: '', phone: '', email: '',
  parent_pay_enabled: false, view_results_fee: 50, pdf_report_fee: 50,
};

const defaultPricingForm: PricingForm = {
  plan_name: 'standard',
  one_time_fee: 10000,
  annual_per_learner: 15,
  termly_per_learner: 5,
  flat_annual: 0,
  flat_termly: 0,
  discount_percent: 0,
  notes: '',
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

  // Lock/Unlock state
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [lockReason, setLockReason] = useState('payment_required');
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockTargetSchool, setLockTargetSchool] = useState<any>(null);

  // Pricing state
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingTargetSchool, setPricingTargetSchool] = useState<any>(null);
  const [pricingForm, setPricingForm] = useState<PricingForm>(defaultPricingForm);
  const [savingPricing, setSavingPricing] = useState(false);

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

  // Lock school
  const openLockModal = (school: any) => {
    setLockTargetSchool(school);
    setLockReason('payment_required');
    setShowLockModal(true);
  };

  const handleLockSchool = async () => {
    if (!lockTargetSchool) return;
    setLockingId(lockTargetSchool.id);
    try {
      const { error } = await supabase
        .from('schools')
        .update({ status: 'locked', locked_reason: lockReason })
        .eq('id', lockTargetSchool.id);
      if (error) throw error;
      toast.success(`${lockTargetSchool.name} has been locked`);
      setShowLockModal(false);
      setLockTargetSchool(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to lock school');
    } finally {
      setLockingId(null);
    }
  };

  // Unlock school
  const handleUnlockSchool = async (school: any) => {
    setLockingId(school.id);
    try {
      const { error } = await supabase
        .from('schools')
        .update({ status: 'active', locked_reason: null })
        .eq('id', school.id);
      if (error) throw error;
      toast.success(`${school.name} has been unlocked`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unlock school');
    } finally {
      setLockingId(null);
    }
  };

  // Open pricing modal
  const openPricingModal = async (school: any) => {
    setPricingTargetSchool(school);
    // Load existing pricing if any
    const { data } = await supabase
      .from('school_pricing')
      .select('*')
      .eq('school_id', school.id)
      .maybeSingle();
    if (data) {
      setPricingForm({
        plan_name: data.plan_name || 'standard',
        one_time_fee: data.one_time_fee || 10000,
        annual_per_learner: data.annual_per_learner || 15,
        termly_per_learner: data.termly_per_learner || 5,
        flat_annual: data.flat_annual || 0,
        flat_termly: data.flat_termly || 0,
        discount_percent: data.discount_percent || 0,
        notes: data.notes || '',
      });
    } else {
      setPricingForm(defaultPricingForm);
    }
    setShowPricingModal(true);
  };

  const handleSavePricing = async () => {
    if (!pricingTargetSchool || !resellerId) return;
    setSavingPricing(true);
    try {
      const { error } = await supabase
        .from('school_pricing')
        .upsert({
          school_id: pricingTargetSchool.id,
          reseller_id: resellerId,
          ...pricingForm,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'school_id' });
      if (error) throw error;
      toast.success('Custom pricing saved for ' + pricingTargetSchool.name);
      setShowPricingModal(false);
      setPricingTargetSchool(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save pricing');
    } finally {
      setSavingPricing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'locked': return 'bg-red-100 text-red-700';
      case 'trial': return 'bg-yellow-100 text-yellow-700';
      case 'expired': return 'bg-gray-100 text-gray-600';
      case 'suspended': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Schools</h1>
          <p className="text-gray-500 text-sm mt-1">Manage schools under your Kimatu Analytics reseller account</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setShowForm(true); setEditingId(null); setForm(defaultForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A365D] text-white rounded-lg hover:bg-[#2D4A7C] text-sm">
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Code *</label>
              <input required value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">County</label>
              <input value={form.county} onChange={e => setForm({...form, county: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Curriculum</label>
              <select value={form.curriculum} onChange={e => setForm({...form, curriculum: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D] bg-white">
                <option value="CBE">CBE (Competency Based Education)</option>
                <option value="844">8-4-4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Principal Name</label>
              <input value={form.principal_name} onChange={e => setForm({...form, principal_name: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School Email</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
            </div>

            {/* Parent-Pay settings */}
            {resellerPayEnabled && (
              <>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.parent_pay_enabled} onChange={e => setForm({...form, parent_pay_enabled: e.target.checked})}
                      className="w-4 h-4 text-[#1A365D]" />
                    <span className="text-sm font-medium text-gray-700">Enable Parent-Pay for this school</span>
                  </label>
                </div>
                {form.parent_pay_enabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">View Results Fee (KES)</label>
                      <input type="number" value={form.view_results_fee} onChange={e => setForm({...form, view_results_fee: parseInt(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PDF Report Fee (KES)</label>
                      <input type="number" value={form.pdf_report_fee} onChange={e => setForm({...form, pdf_report_fee: parseInt(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1A365D]" />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="md:col-span-2 flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving} className="px-4 py-2 bg-[#1A365D] text-white rounded-lg text-sm hover:bg-[#2D4A7C] disabled:opacity-50">
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A365D]" />
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((s) => (
                  <tr key={s.id} className={`border-b last:border-0 hover:bg-gray-50 ${s.status === 'locked' ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{s.name}</div>
                      {s.locked_reason && (
                        <div className="text-xs text-red-600 mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {s.locked_reason.replace(/_/g, ' ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.code}</td>
                    <td className="px-4 py-3">{s.curriculum === 'CBE' || s.curriculum === 'CBC' ? 'CBE' : (s.curriculum || 'CBE')}</td>
                    <td className="px-4 py-3">{s.county || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadge(s.status)}`}>
                        {s.status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Edit */}
                        <button onClick={() => handleEdit(s)} title="Edit school" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        {/* Lock/Unlock */}
                        {s.status === 'locked' ? (
                          <button
                            onClick={() => handleUnlockSchool(s)}
                            disabled={lockingId === s.id}
                            title="Unlock school"
                            className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 disabled:opacity-50"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openLockModal(s)}
                            disabled={lockingId === s.id}
                            title="Lock school (payment required)"
                            className="p-1.5 hover:bg-red-50 rounded-lg text-red-600 disabled:opacity-50"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        )}
                        {/* Custom Pricing */}
                        <button
                          onClick={() => openPricingModal(s)}
                          title="Set custom pricing"
                          className="p-1.5 hover:bg-yellow-50 rounded-lg text-yellow-600"
                        >
                          <DollarSign className="w-4 h-4" />
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

      {/* Lock Confirmation Modal */}
      {showLockModal && lockTargetSchool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <Lock className="w-5 h-5" /> Lock School Access
              </h3>
              <button onClick={() => setShowLockModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-red-700">
                You are about to lock <strong>{lockTargetSchool.name}</strong>. The school admin will see a payment required message and will not be able to access the dashboard until you unlock it.
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lock Reason</label>
              <select value={lockReason} onChange={e => setLockReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="payment_required">Payment Required</option>
                <option value="subscription_expired">Subscription Expired</option>
                <option value="trial_ended">Trial Period Ended</option>
                <option value="account_review">Account Under Review</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowLockModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleLockSchool} disabled={lockingId !== null}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                <Lock className="w-4 h-4" /> {lockingId ? 'Locking...' : 'Lock School'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Pricing Modal */}
      {showPricingModal && pricingTargetSchool && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1A365D] flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Custom Pricing — {pricingTargetSchool.name}
              </h3>
              <button onClick={() => setShowPricingModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Set custom pricing for this school. This overrides the default platform pricing.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select value={pricingForm.plan_name} onChange={e => setPricingForm({...pricingForm, plan_name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                  <option value="essential">Essential</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                <input type="number" min="0" max="100" value={pricingForm.discount_percent}
                  onChange={e => setPricingForm({...pricingForm, discount_percent: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">One-Time Setup Fee (KES)</label>
                <input type="number" value={pricingForm.one_time_fee}
                  onChange={e => setPricingForm({...pricingForm, one_time_fee: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Annual Per Learner (KES)</label>
                <input type="number" value={pricingForm.annual_per_learner}
                  onChange={e => setPricingForm({...pricingForm, annual_per_learner: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Termly Per Learner (KES)</label>
                <input type="number" value={pricingForm.termly_per_learner}
                  onChange={e => setPricingForm({...pricingForm, termly_per_learner: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flat Annual Fee (KES, 0 = per-learner)</label>
                <input type="number" value={pricingForm.flat_annual}
                  onChange={e => setPricingForm({...pricingForm, flat_annual: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Flat Termly Fee (KES, 0 = per-learner)</label>
                <input type="number" value={pricingForm.flat_termly}
                  onChange={e => setPricingForm({...pricingForm, flat_termly: parseInt(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={pricingForm.notes} onChange={e => setPricingForm({...pricingForm, notes: e.target.value})}
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setShowPricingModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handleSavePricing} disabled={savingPricing}
                className="px-4 py-2 bg-[#1A365D] text-white rounded-lg text-sm hover:bg-[#2D4A7C] disabled:opacity-50 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> {savingPricing ? 'Saving...' : 'Save Pricing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
