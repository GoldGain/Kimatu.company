import { Map, CheckCircle2, AlertTriangle } from 'lucide-react';

const strands = [
  { name: 'Mathematics — Algebra', coverage: 82, status: 'on-track' },
  { name: 'English — Writing', coverage: 64, status: 'watch' },
  { name: 'Science — Biology', coverage: 91, status: 'on-track' },
  { name: 'Social Studies — Governance', coverage: 48, status: 'gap' },
];

export default function CurriculumMapping() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Map className="w-7 h-7 text-blue-600" /> Curriculum Mapping
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Coverage and gaps across learning areas</p>
      </div>
      <div className="space-y-3">
        {strands.map((s) => (
          <div key={s.name} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">{s.name}</h3>
              <span className="text-sm flex items-center gap-1">
                {s.status === 'gap' ? <AlertTriangle className="w-4 h-4 text-amber-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {s.coverage}%
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className={`h-full ${s.coverage >= 75 ? 'bg-emerald-500' : s.coverage >= 55 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${s.coverage}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
