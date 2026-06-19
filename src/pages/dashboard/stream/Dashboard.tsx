import { useState, useEffect } from 'react';
import { supabaseUntyped } from "@/lib/supabase/client";
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Users, Filter, Loader2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function StreamDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [streamData, setStreamData] = useState<any>(null);

  useEffect(() => {
    if (user?.schoolId) {
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      const { data } = await supabaseUntyped
        .from('classes')
        .select('*')
        .eq('school_id', user?.schoolId);
      setClasses(data || []);
      if (data && data.length > 0) {
        setSelectedClass(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStreamAnalytics();
    }
  }, [selectedClass]);

  const fetchStreamAnalytics = async () => {
    setLoading(true);
    try {
      // This would involve complex joins for performance analysis
      // For now, we'll fetch basic student count and results summary
      const { count } = await supabaseUntyped
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', selectedClass);

      setStreamData({
        totalStudents: count || 0,
        averagePerformance: 0,
        topStudents: []
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && classes.length === 0) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111111]">Stream Dashboard</h1>
          <p className="text-sm text-[#666666]">Comparative performance analysis by stream</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          <Filter className="w-4 h-4 text-gray-400" />
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-sm font-medium border-none focus:ring-0 bg-transparent"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600">Students in Stream</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{streamData?.totalStudents || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600">Stream Average</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">0%</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-gray-600">Performance Rank</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">N/A</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-300">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900">Detailed Stream Analysis</h3>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">
          Detailed comparative charts and subject-by-subject ranking for this stream will appear here once results are published.
        </p>
      </div>
    </div>
  );
}
