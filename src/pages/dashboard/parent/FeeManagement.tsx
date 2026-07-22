import { CreditCard, Download, Receipt } from 'lucide-react';
import { Link } from 'react-router';

export default function FeeManagement() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-7 h-7 text-blue-600" /> Fee Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Fee structure, payment history and receipts</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm text-gray-500">Outstanding balance</p>
          <p className="text-2xl font-bold mt-1">KES —</p>
        </div>
        <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm text-gray-500">Last payment</p>
          <p className="text-2xl font-bold mt-1">—</p>
        </div>
        <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 dark:border-gray-800">
          <p className="text-sm text-gray-500">Receipts</p>
          <p className="text-2xl font-bold mt-1 flex items-center gap-2"><Receipt className="w-5 h-5" /> Available</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/parent/fees" className="bg-blue-600 text-white px-4 py-2 rounded-lg">Open Fees</Link>
        <Link to="/parent/fee-transcript" className="border px-4 py-2 rounded-lg flex items-center gap-2"><Download className="w-4 h-4" /> Fee transcript</Link>
      </div>
    </div>
  );
}
