import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import PWAInstallButton from '@/components/PWAInstallButton';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  Library,
  FileText,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  School,
  UserCheck,
  CreditCard,
  BarChart3,
  MessageSquare,
  Bot,
  Home,
  Upload,
  ClipboardList,
  Award,
  Clock,
  Download,
  Palette,
  Sparkles,
  Share2,
  DollarSign,
  Building2,
  Calendar,
  Zap,
  Brain,
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  children?: { label: string; path: string }[];
}

const navConfig: Record<string, NavItem[]> = {
  'master-super-admin': [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/master-admin' },
    { label: 'Resellers', icon: <Building2 className="w-5 h-5" />, path: '/master-admin/resellers' },
    { label: 'All Schools', icon: <School className="w-5 h-5" />, path: '/master-admin/schools' },
    { label: 'All Students', icon: <Users className="w-5 h-5" />, path: '/master-admin/students' },
    { label: 'All Payments', icon: <DollarSign className="w-5 h-5" />, path: '/master-admin/payments' },
    { label: 'Platform Settings', icon: <Settings className="w-5 h-5" />, path: '/master-admin/settings' },
  ],
  'reseller-super-admin': [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/reseller-admin' },
    { label: 'My Schools', icon: <School className="w-5 h-5" />, path: '/reseller-admin/schools' },
    { label: 'School Admins', icon: <UserCheck className="w-5 h-5" />, path: '/reseller-admin/school-admins' },
    { label: 'My Payments', icon: <DollarSign className="w-5 h-5" />, path: '/reseller-admin/payments' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/reseller-admin/change-password' },
  ],
  'super-admin': [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/super-admin' },
    { label: 'Schools', icon: <School className="w-5 h-5" />, path: '/super-admin/schools' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, path: '/super-admin/analytics' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/super-admin/settings' },
  ],
  'school-admin': [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/school-admin' },
    { label: 'Students', icon: <Users className="w-5 h-5" />, path: '/school-admin/students' },
    { label: 'Teachers', icon: <UserCheck className="w-5 h-5" />, path: '/school-admin/teachers' },
    { label: 'Classes', icon: <School className="w-5 h-5" />, path: '/school-admin/classes' },
    { label: 'Subjects', icon: <Library className="w-5 h-5" />, path: '/school-admin/subjects' },
    { label: 'Assign Teachers', icon: <UserCheck className="w-5 h-5" />, path: '/school-admin/timetable/assign' },
    { label: 'Timetable Setup', icon: <Settings className="w-5 h-5" />, path: '/school-admin/timetable/setup' },
    { label: 'Generate Timetable', icon: <Zap className="w-5 h-5" />, path: '/school-admin/timetable/generate' },
    { label: 'View Timetable', icon: <Calendar className="w-5 h-5" />, path: '/school-admin/timetable/view' },
    { label: 'Fees', icon: <CreditCard className="w-5 h-5" />, path: '/school-admin/fees' },
    { label: 'Results', icon: <FileText className="w-5 h-5" />, path: '/school-admin/results' },
    { label: 'Announcements', icon: <Bell className="w-5 h-5" />, path: '/school-admin/announcements' },
    { label: 'Branding & Notifications', icon: <Palette className="w-5 h-5" />, path: '/school-admin/branding' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/school-admin/change-password' },
  ],
  'teacher': [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/teacher' },
    { label: 'My Subjects', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/my-subjects' },
    { label: 'View Timetable', icon: <Calendar className="w-5 h-5" />, path: '/timetable' },
    { label: 'Upload Results', icon: <Upload className="w-5 h-5" />, path: '/teacher/results/upload' },
    { label: 'Attendance', icon: <ClipboardList className="w-5 h-5" />, path: '/teacher/attendance' },
    { label: 'Homework', icon: <BookOpen className="w-5 h-5" />, path: '/teacher/homework' },
    { label: 'Analytics', icon: <BarChart3 className="w-5 h-5" />, path: '/teacher/analytics' },
    { label: 'My Students', icon: <Users className="w-5 h-5" />, path: '/teacher/students' },
    { label: 'Lesson Plans', icon: <Sparkles className="w-5 h-5" />, path: '/teacher/lesson-plan' },
    { label: 'Curriculum Navigator', icon: <Brain className="w-5 h-5" />, path: '/teacher/curriculum' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/teacher/change-password' },
  ],
  'student': [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/student' },
    { label: 'Timetable', icon: <Calendar className="w-5 h-5" />, path: '/timetable' },
    { label: 'My Results', icon: <Award className="w-5 h-5" />, path: '/student/results' },
    { label: 'Fees', icon: <CreditCard className="w-5 h-5" />, path: '/student/fees' },
    { label: 'Attendance', icon: <ClipboardList className="w-5 h-5" />, path: '/student/attendance' },
    { label: 'Homework', icon: <BookOpen className="w-5 h-5" />, path: '/student/homework' },
    { label: 'Report Card', icon: <FileText className="w-5 h-5" />, path: '/student/report-card' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/student/change-password' },
  ],
  'parent': [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/parent' },
    { label: 'My Children', icon: <Users className="w-5 h-5" />, path: '/parent/children' },
    { label: 'Timetable', icon: <Calendar className="w-5 h-5" />, path: '/parent/timetable' },
    { label: 'Fees', icon: <CreditCard className="w-5 h-5" />, path: '/parent/fees' },
    { label: 'Conferences', icon: <MessageSquare className="w-5 h-5" />, path: '/parent/conferences' },
    { label: 'AI Assistant', icon: <Bot className="w-5 h-5" />, path: '/parent/chatbot' },
    { label: 'Report Card', icon: <FileText className="w-5 h-5" />, path: '/parent/report-card' },
    { label: 'Change Password', icon: <Settings className="w-5 h-5" />, path: '/parent/change-password' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const roleKey = user?.role?.replace(/_/g, '-') || '';
  const navItems = navConfig[roleKey] || [];

  const handleLogout = async () => {
    await signOut();
    navigate('/auth/login');
  };

  const handleWhatsAppShare = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(`Check out CBE-Analytics - School Management System: ${window.location.origin}`);
    window.open(`https://wa.me/?text=${text}%20${url}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#1A1A1A] text-white transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">CBE-Analytics</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex flex-col h-[calc(100%-65px)]">
          <div className="flex items-center gap-3 mb-6 px-2 py-3 bg-gray-800/50 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-sm font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  location.pathname === item.path 
                    ? 'bg-[#2563EB] text-white' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-green-400 hover:bg-green-600 hover:text-white transition-all w-full font-medium"
            >
              <Share2 className="w-5 h-5" />
              Share via WhatsApp
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-all w-full font-medium"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#E5E5E5] px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:flex items-center gap-2">
              <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-[#111111]">CBE-Analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <PWAInstallButton variant="icon" />
              <Link to="/" className="text-sm text-[#666666] hover:text-[#111111] flex items-center gap-1">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <button
                onClick={handleWhatsAppShare}
                className="hidden md:flex items-center gap-1.5 text-sm text-green-600 hover:text-green-800 font-medium"
                title="Share via WhatsApp"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden lg:inline">Share</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-bold">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
