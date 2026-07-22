import { BookOpen, FileText, Video, Download } from 'lucide-react';

const resources = [
  { title: 'Revision Notes — Core Subjects', type: 'Notes', icon: BookOpen },
  { title: 'Past Papers Pack', type: 'Papers', icon: FileText },
  { title: 'Concept Video Library', type: 'Videos', icon: Video },
  { title: 'Downloadable Worksheets', type: 'Downloads', icon: Download },
];

export default function LearningResources() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Resources</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Notes, videos, past papers and revision materials</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {resources.map((r) => (
          <div key={r.title} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 hover:border-blue-400 transition-colors">
            <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center mb-3">
              <r.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{r.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{r.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
