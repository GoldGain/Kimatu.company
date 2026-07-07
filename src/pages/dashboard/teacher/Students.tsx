import { useEffect, useState } from 'react';
import { supabaseUntyped } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search } from 'lucide-react';

export default function TeacherStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStudents(); }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data } = await supabaseUntyped.from('students').select('*, classes(name)').eq('school_id', user?.schoolId).eq('is_active', true).order('first_name');
    setStudents(data || []);
    setLoading(false);
  };

  const filtered = students.filter(s =>
    s.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-[#111111]">My Students</h1><p className="text-sm text-[#666666]">{students.length} active students</p></div>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full text-center py-8 text-sm text-[#666666]">Loading...</div> :
         filtered.length === 0 ? <div className="col-span-full text-center py-8 text-sm text-[#666666] bg-white rounded-2xl">No students found</div> :
         filtered.map(s => (
          <div key={s.id} className="bg-white rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">{s.first_name[0]}{s.last_name[0]}</div>
              <div>
                <p className="font-semibold text-[#111111]">{s.first_name} {s.last_name}</p>
                <p className="text-xs text-[#666666]">{s.admission_number}</p>
              </div>
            </div>
            <div className="space-y-1 text-xs text-[#666666]">
              <p>Class: <span className="font-medium">{s.classes?.name}</span></p>
              <p>Curriculum: <span className="font-medium">{s.curriculum}</span></p>
              <p>Gender: <span className="font-medium capitalize">{s.gender}</span></p>
              {s.parent_name && <p>Parent: <span className="font-medium">{s.parent_name}</span></p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
