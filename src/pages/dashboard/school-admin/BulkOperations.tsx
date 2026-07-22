import { useState } from 'react';
import { Upload, Users, FileSpreadsheet, Mail, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const actions = [
  { id: 'students', title: 'Bulk Add Learners', desc: 'Upload a CSV of learner details', icon: Users },
  { id: 'marks', title: 'Bulk Upload Marks', desc: 'Import assessment scores from Excel/CSV', icon: FileSpreadsheet },
  { id: 'email', title: 'Bulk Email', desc: 'Send announcements to parents or staff', icon: Mail },
  { id: 'sms', title: 'Bulk SMS', desc: 'Notify guardians via SMS gateway', icon: MessageSquare },
];

export default function BulkOperations() {
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (id: string) => {
    setBusy(id);
    await new Promise((r) => setTimeout(r, 600));
    toast.success('Template ready — use the matching portal tools to complete the upload.');
    setBusy(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Upload className="w-7 h-7 text-blue-600" /> Bulk Operations
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Speed up admin work with batch actions</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((a) => (
          <button
            key={a.id}
            onClick={() => run(a.id)}
            disabled={busy === a.id}
            className="text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <a.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{a.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{a.desc}</p>
                <p className="text-xs text-blue-600 mt-3">{busy === a.id ? 'Preparing…' : 'Open action →'}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
