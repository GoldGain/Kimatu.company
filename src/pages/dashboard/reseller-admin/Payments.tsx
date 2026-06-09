import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RefreshCw, Download } from 'lucide-react';
import type { ParentPayment } from '@/types/database';

export default function ResellerPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<ParentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [resellerId, setResellerId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: resellerData } = await supabase
      .from('resellers').select('id').eq('user_id', user!.id).maybeSingle();
    
    if (resellerData) {
      setResellerId(resellerData.id);
      const { data } = await supabase
        .from('parent_payments')
        .select('*')
        .eq('reseller_id', resellerData.id)
        .order('created_at', { ascending: false });
      setPayments((data || []) as ParentPayment[]);
    }
    setLoading(false);
  };

  const totalRevenue = payments.filter(p => p.status === 'success').reduce((sum, p) => sum + p.amount, 0);

  const exportCSV = () => {
    const headers = ['Parent Name', 'Student Name', 'School', 'Amount (KES)', 'Type', 'Status', 'Date'];
    const rows = payments.map(p => [
      p.parent_name || '', p.student_name || '', p.school_name || '',
      p.amount, p.payment_type?.replace('_', ' ') || '', p.status,
      p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
          <p className="text-gray-500 text-sm mt-1">Parent payments for your schools only</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <p className="text-sm text-green-700">Total Revenue</p>
        <p className="text-2xl font-bold text-green-800">KES {totalRevenue.toLocaleString()}</p>
        <p className="text-xs text-green-600 mt-1">{payments.filter(p => p.status === 'success').length} successful payments</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No payments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left text-gray-500">
                  <th className="px-4 py-3">Parent</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">{p.parent_name || '—'}</td>
                    <td className="px-4 py-3">{p.student_name || '—'}</td>
                    <td className="px-4 py-3">{p.school_name || '—'}</td>
                    <td className="px-4 py-3 font-medium">KES {p.amount}</td>
                    <td className="px-4 py-3 capitalize">{p.payment_type?.replace('_', ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === 'success' ? 'bg-green-100 text-green-700' :
                        p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
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
