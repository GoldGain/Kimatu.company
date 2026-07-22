import { useState } from 'react';
import { BookOpen, Plus, Calendar, Target } from 'lucide-react';
import { toast } from 'sonner';

interface Plan { id: string; title: string; subject: string; date: string; objectives: string; }

export default function LessonPlanner() {
  const [plans, setPlans] = useState<Plan[]>([
    { id: '1', title: 'Introduction to Algebra', subject: 'Mathematics', date: new Date().toISOString().slice(0,10), objectives: 'Solve linear equations' },
  ]);
  const [form, setForm] = useState({ title: '', subject: '', date: '', objectives: '' });

  const add = () => {
    if (!form.title || !form.subject) { toast.error('Title and subject required'); return; }
    setPlans((p) => [{ id: String(Date.now()), ...form, date: form.date || new Date().toISOString().slice(0,10) }, ...p]);
    setForm({ title: '', subject: '', date: '', objectives: '' });
    toast.success('Lesson plan added');
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-blue-600" /> Lesson Planner
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Create and manage curriculum-aligned lesson plans</p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><Plus className="w-4 h-4" /> New plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded-lg px-3 py-2 bg-transparent" placeholder="Lesson title" value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} />
          <input className="border rounded-lg px-3 py-2 bg-transparent" placeholder="Subject / Learning area" value={form.subject} onChange={(e)=>setForm({...form,subject:e.target.value})} />
          <input type="date" className="border rounded-lg px-3 py-2 bg-transparent" value={form.date} onChange={(e)=>setForm({...form,date:e.target.value})} />
          <input className="border rounded-lg px-3 py-2 bg-transparent" placeholder="Objectives" value={form.objectives} onChange={(e)=>setForm({...form,objectives:e.target.value})} />
        </div>
        <button onClick={add} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save plan</button>
      </div>
      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{p.subject}</span>
            </div>
            <div className="mt-2 text-sm text-gray-500 flex flex-wrap gap-4">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{p.date}</span>
              <span className="flex items-center gap-1"><Target className="w-4 h-4" />{p.objectives}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
