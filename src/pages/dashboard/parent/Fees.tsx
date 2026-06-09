import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabaseUntyped } from '@/lib/supabase/client';
import { CreditCard, AlertTriangle, Receipt, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: Record<string, any>) => { openIframe: () => void };
    };
  }
}

const THEOPHILLUS_OWNER_ID = '7e1a65d1-6443-4ba8-8dc9-c6a91ecd1eb1';

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

export default function ParentFees() {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [schoolPayment, setSchoolPayment] = useState<any>(null);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);

  useEffect(() => { fetchChildren(); }, [user?.id]);

  const fetchChildren = async () => {
    if (!user?.id) return;
    const { data: linked } = await supabaseUntyped
      .from('parent_student_links')
      .select('*, students(first_name, last_name, id, school_id)')
      .eq('parent_id', user.id);

    if (linked) {
      const kids = linked.map((l: any) => l.students).filter(Boolean);
      setChildren(kids);
      if (kids.length > 0) fetchFees(kids[0].id, kids);
    }
  };

  const fetchSchoolPaymentConfig = async (schoolId?: string) => {
    if (!schoolId) {
      setSchoolPayment(null);
      return;
    }

    const { data, error } = await supabaseUntyped
      .from('schools')
      .select('id, name, owner_id, paystack_public_key, paystack_enabled, paystack_currency')
      .eq('id', schoolId)
      .single();

    if (error || !data) {
      setSchoolPayment(null);
      return;
    }

    const enabledForTheophillus =
      data.owner_id === THEOPHILLUS_OWNER_ID &&
      data.paystack_enabled === true &&
      typeof data.paystack_public_key === 'string' &&
      data.paystack_public_key.trim().startsWith('pk_');

    setSchoolPayment({ ...data, enabledForTheophillus });
  };

  const fetchFees = async (childId: string, kidsOverride?: any[]) => {
    const list = kidsOverride || children;
    const child = list.find((c: any) => c.id === childId);
    setSelectedChild(child);
    await fetchSchoolPaymentConfig(child?.school_id);

    const { data } = await supabaseUntyped
      .from('fee_invoices')
      .select('*, terms(name)')
      .eq('student_id', childId)
      .order('created_at', { ascending: false });
    setInvoices(data || []);
  };

  const refreshCurrentChild = async () => {
    if (selectedChild?.id) await fetchFees(selectedChild.id);
  };

  const handlePaystackPayment = async (invoice: any) => {
    if (!user?.email) { toast.error('Your account email is required for Paystack payment.'); return; }
    if (!schoolPayment?.enabledForTheophillus) { toast.error('Online payment is not enabled for this school.'); return; }
    const amount = Number(invoice.balance || 0);
    if (amount <= 0) { toast.success('This invoice is already paid.'); return; }

    setPayingInvoice(invoice.id);
    try {
      await loadPaystackScript();
      const reference = `CBE-${invoice.id.slice(0, 8)}-${Date.now()}`;
      const handler = window.PaystackPop!.setup({
        key: schoolPayment.paystack_public_key,
        email: user.email,
        amount: Math.round(amount * 100),
        currency: schoolPayment.paystack_currency || 'KES',
        ref: reference,
        metadata: {
          invoice_id: invoice.id,
          school_id: invoice.school_id,
          student_id: invoice.student_id,
          parent_id: user.id,
          school_name: schoolPayment.name,
        },
        callback: async (response: any) => {
          try {
            const paidAmount = amount;
            const newAmountPaid = Number(invoice.amount_paid || 0) + paidAmount;
            const newBalance = Math.max(0, Number(invoice.total_amount || 0) - newAmountPaid);
            const nextStatus = newBalance <= 0 ? 'paid' : 'partial';

            const { error: paymentError } = await supabaseUntyped.from('fee_payments').insert({
              school_id: invoice.school_id,
              invoice_id: invoice.id,
              student_id: invoice.student_id,
              amount: paidAmount,
              payment_method: 'other',
              reference_number: response.reference || reference,
              payment_date: new Date().toISOString(),
              notes: 'Paystack parent payment',
            });
            if (paymentError) throw new Error(paymentError.message);

            const { error: invoiceError } = await supabaseUntyped
              .from('fee_invoices')
              .update({ amount_paid: newAmountPaid, balance: newBalance, status: nextStatus })
              .eq('id', invoice.id);
            if (invoiceError) throw new Error(invoiceError.message);

            toast.success('Payment recorded successfully.');
            await refreshCurrentChild();
          } catch (err: any) {
            toast.error(`Payment succeeded but recording failed: ${err.message}`);
          } finally {
            setPayingInvoice(null);
          }
        },
        onClose: () => {
          setPayingInvoice(null);
          toast.info('Payment window closed.');
        },
      });
      handler.openIframe();
    } catch (err: any) {
      setPayingInvoice(null);
      toast.error(err.message || 'Unable to start Paystack payment.');
    }
  };

  const totalBalance = invoices.reduce((s, i) => s + (i.balance || 0), 0);
  const canPayOnline = Boolean(schoolPayment?.enabledForTheophillus);

  const statusColor = (status: string) => {
    if (status === 'paid') return 'bg-green-100 text-green-700';
    if (status === 'partial') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#111111]">Fee Balances</h1><p className="text-sm text-[#666666]">View your children&apos;s fee status and available payment options</p></div>

      {canPayOnline ? (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-800">Online Paystack Payment Enabled</p>
            <p className="text-xs text-green-600 mt-1">This school is owned by Theophillus Ngewa and is configured for parent payments through its own Paystack public key.</p>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Physical Payment Only</p>
            <p className="text-xs text-yellow-600 mt-1">Online parent-pay is restricted to Theophillus&apos;s schools with Paystack enabled. Contact the school office for cash, bank, or M-Pesa payment instructions.</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        {children.map((child, i) => (
          <button key={i} onClick={() => fetchFees(child.id)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${selectedChild?.id === child.id ? 'bg-[#2563EB] text-white' : 'bg-white text-[#111111] shadow-sm hover:bg-gray-50'}`}>
            <span className="text-sm font-medium">{child.first_name} {child.last_name}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center"><CreditCard className="w-6 h-6 text-red-500" /></div>
          <div>
            <p className="text-sm text-[#666666]">Total Outstanding Balance</p>
            <p className="text-2xl font-bold text-red-500">Ksh {totalBalance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Term</th>
              <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Total</th>
              <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Paid</th>
              <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Balance</th>
              <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Status</th>
              <th className="text-left text-xs font-medium text-[#666666] uppercase px-6 py-4">Action</th>
            </tr></thead>
            <tbody>
              {invoices.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-sm text-[#666666]">No fee records</td></tr> :
               invoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4"><div className="flex items-center gap-2"><Receipt className="w-4 h-4 text-gray-400" /><span className="text-sm">{inv.terms?.name}</span></div></td>
                  <td className="px-6 py-4 text-sm">Ksh {inv.total_amount?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-green-600">Ksh {inv.amount_paid?.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-red-500">Ksh {inv.balance?.toLocaleString()}</td>
                  <td className="px-6 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(inv.status)} capitalize`}>{inv.status}</span></td>
                  <td className="px-6 py-4">
                    {canPayOnline && Number(inv.balance || 0) > 0 ? (
                      <button onClick={() => handlePaystackPayment(inv)} disabled={payingInvoice === inv.id} className="inline-flex items-center gap-2 bg-[#2563EB] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#1d4ed8] disabled:opacity-50">
                        {payingInvoice === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
                        Pay with Paystack
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">{inv.status === 'paid' ? 'Paid' : 'Office payment'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
