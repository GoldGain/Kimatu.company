import { useState } from 'react';
import { Target, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Goal { id: string; title: string; progress: number; }

export default function GoalSetting() {
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', title: 'Score 80%+ in Mathematics', progress: 60 },
    { id: '2', title: 'Complete all homework this term', progress: 40 },
  ]);
  const [title, setTitle] = useState('');

  const add = () => {
    if (!title.trim()) return;
    setGoals((g) => [{ id: String(Date.now()), title: title.trim(), progress: 0 }, ...g]);
    setTitle('');
    toast.success('Goal added');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" /> Goal Setting
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Set academic goals and track your progress</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input className="flex-1 border rounded-lg px-3 py-2 bg-transparent" placeholder="New academic goal" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <button onClick={add} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Add</button>
      </div>
      <div className="space-y-3">
        {goals.map((g) => (
          <div key={g.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium"><CheckCircle2 className="w-4 h-4 text-emerald-500" />{g.title}</div>
              <span className="text-sm text-gray-500">{g.progress}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${g.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
