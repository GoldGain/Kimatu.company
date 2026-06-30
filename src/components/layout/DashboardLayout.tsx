import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  GraduationCap,
  Settings,
  Users,
  BarChart3,
  FileText,
  MessageSquare,
  LogOut,
  X,
  Menu,
  User,
  Bell,
  Palette,
  CreditCard,
  Calendar,
  Library,
  ClipboardList,
  School,
  Award,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: { label: string; path: string }[];
}

// Navigation config for each user role - ALL paths must exist in App.tsx
const navConfig: Record<string, NavItem[]> = {
  school_admin: [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/school-admin' },
    { label: 'Students', icon: <Users className="w-5 h-5" />, path: '/school-admin/students' },
    { label: 'Teachers', icon: <GraduationCap className="w-5 h-5" />, path: '/school-admin/teachers' },
    { label: 'Classes', icon: <BookOpen className="w-5 h-5" />, path: '/school-admin/classes' },
    { label: 'Subjects', icon: <FileText className="w-5 h-5" />, path: '/school-admin/subjects' },
    { label: 'Exams', icon: <Award className="w-5 h-5" />, path: '/school-admin/exams' },
    { label: 'Assessments', icon: <FileText className="w-5 h-5" />, path: '/school-admin/assessments' },
    { label: 'Results', icon: <TrendingUp className="w-5 h-5" />, path: '/school-admin/results' },
    { label: 'Report Cards', icon: <FileText className="w-5 h-5" />, path: '/school-admin/report-cards' },
    { label: 'Fee Manager', icon: <CreditCard className="w-5 h-5" />, path: '/school-admin/fees' },
    { label: 'Attendance', icon: <ClipboardList className="w-5 h-5" />, path: '/school-admin/attendance' },
    { label: 'Library', icon: <Library className="w-5 h-5" />, path: '/school-admin/library' },
    { label: 'Timetable', icon: <Calendar className="w-5 h-5" />, path: '/school-admin/timetable/setup' },
    { label: 'Assign Teachers', icon: <GraduationCap className="w-5 h-5" />, path: '/school-admin/assign-teachers' },
    { label: 'Assign Roles', icon: <Users className="w-5 h-5" />, path: '/school-admin/assign-roles' },
    { label: 'Stream Dashboard', icon: <BarChart3 className="w-5 h-5" />, path: '/school-admin/stream-dashboard' },
    { label: 'Announcements', icon: <Bell className="w-5 h-5" />, path: '/school-admin/announcements' },
    { label: 'Branding', icon: <Palette className="w-5 h-5" />, path: '/school-admin/branding' },
    { label: 'Bulk SMS', icon: <MessageSquare className="w-5 h-5" />, path: '/school-admin/bulk-sms' },
    { label: 'My Profile', icon: <User className="w-5 h-5" />, path: '/school-admin/profile' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/school-admin/change-password' },
  ],
  teacher: [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/teacher' },
    { label: 'Upload Results', icon: <FileText className="w-5 h-5" />, path: '/teacher/upload-results' },
    { label: 'My Students', icon: <Users className="w-5 h-5" />, path: '/teacher/students' },
    { label: 'CATs', icon: <Award className="w-5 h-5" />, path: '/teacher/cats' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/analytics' },
    { label: 'Timetable', icon: <Calendar className="w-5 h-5" />, path: '/teacher/timetable' },
    { label: 'Assignments', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/assignments' },
    { label: 'My Profile', icon: <User className="w-5 h-5" />, path: '/teacher/profile' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/teacher/change-password' },
  ],
  student: [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/student' },
    { label: 'My Results', icon: <TrendingUp className="w-5 h-5" />, path: '/student/results' },
    { label: 'Report Card', icon: <FileText className="w-5 h-5" />, path: '/student/report-card' },
    { label: 'Timetable', icon: <Calendar className="w-5 h-5" />, path: '/student/timetable' },
    { label: 'Assignments', icon: <BookOpen className="w-5 h-5" />, path: '/student/assignments' },
    { label: 'Homework', icon: <BookOpen className="w-5 h-5" />, path: '/student/homework' },
    { label: 'Fee Info', icon: <CreditCard className="w-5 h-5" />, path: '/student/fees' },
    { label: 'Attendance', icon: <ClipboardList className="w-5 h-5" />, path: '/student/attendance' },
    { label: 'Library', icon: <Library className="w-5 h-5" />, path: '/student/library' },
    { label: 'My Profile', icon: <User className="w-5 h-5" />, path: '/student/profile' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/student/change-password' },
  ],
  parent: [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/parent' },
    { label: 'My Children', icon: <Users className="w-5 h-5" />, path: '/parent/children' },
    { label: 'Results', icon: <TrendingUp className="w-5 h-5" />, path: '/parent/results' },
    { label: 'Report Card', icon: <FileText className="w-5 h-5" />, path: '/parent/child-report-card' },
    { label: 'Fee Info', icon: <CreditCard className="w-5 h-5" />, path: '/parent/fees' },
    { label: 'Attendance', icon: <ClipboardList className="w-5 h-5" />, path: '/parent/attendance' },
    { label: 'Announcements', icon: <Bell className="w-5 h-5" />, path: '/parent/announcements' },
    { label: 'My Profile', icon: <User className="w-5 h-5" />, path: '/parent/profile' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/parent/change-password' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>('school_admin');

  useEffect(() => {
    if (user?.role) {
      setUserRole(user.role);
    }
  }, [user?.role]);

  const navItems = navConfig[userRole] || navConfig['school_admin'];

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#1A365D] text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#1A365D] font-black text-sm">K</span>
            </div>
            <span className="font-bold text-sm">Kimatu Analytics</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-80px)]">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                location.pathname === item.path
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full mt-4"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4 ml-auto">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500 capitalize">{userRole?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
