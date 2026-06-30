import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';

// ─── Auth Pages ──────────────────────────────────────────────
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';

// ─── Public Pages ────────────────────────────────────────────
import Landing from '@/pages/Landing';

// ─── School Admin Pages ──────────────────────────────────────
import SchoolAdminDashboard from '@/pages/dashboard/school-admin/Dashboard';
import SchoolAdminStudents from '@/pages/dashboard/school-admin/Students';
import SchoolAdminTeachers from '@/pages/dashboard/school-admin/Teachers';
import SchoolAdminClasses from '@/pages/dashboard/school-admin/Classes';
import SchoolAdminSubjects from '@/pages/dashboard/school-admin/Subjects';
import SchoolAdminExams from '@/pages/dashboard/school-admin/Exams';
import SchoolAdminAssessments from '@/pages/dashboard/school-admin/Assessments';
import SchoolAdminAssignRoles from '@/pages/dashboard/school-admin/AssignRoles';
import SchoolAdminBulkSMS from '@/pages/dashboard/school-admin/BulkSMS';
import DeanOfStudiesDashboard from '@/pages/dashboard/dean-of-studies/Dashboard';
import TeacherDashboard from '@/pages/dashboard/teacher/Dashboard';
import TeacherResultsUpload from '@/pages/dashboard/teacher/ResultsUpload';
import TeacherStudents from '@/pages/dashboard/teacher/Students';
import TeacherAnalytics from '@/pages/dashboard/teacher/Analytics';
import StudentDashboard from '@/pages/dashboard/student/Dashboard';
import StudentResults from '@/pages/dashboard/student/Results';
import ParentDashboard from '@/pages/dashboard/parent/Dashboard';
import ParentChild from '@/pages/dashboard/parent/Child';
import TimetableView from '@/pages/dashboard/TimetableView';
import ReportCard from '@/pages/dashboard/student/ReportCard';
import CATs from '@/pages/dashboard/teacher/CATs';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />

      {/* School Admin routes */}
      <Route path="/school-admin" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/students" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminStudents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/teachers" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminTeachers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/classes" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminClasses /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/subjects" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminSubjects /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/exams" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminExams /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/assessments" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminAssessments /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/assign-roles" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminAssignRoles /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/bulk-sms" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminBulkSMS /></DashboardLayout></ProtectedRoute>} />
      <Route path="/dean-of-studies" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><DashboardLayout><DeanOfStudiesDashboard /></DashboardLayout></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/upload-results" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherResultsUpload /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherStudents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/cats" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><CATs /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/analytics" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherAnalytics /></DashboardLayout></ProtectedRoute>} />

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/results" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentResults /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/report-card" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><ReportCard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><TimetableView /></DashboardLayout></ProtectedRoute>} />

      {/* Parent routes */}
      <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/child" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentChild /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/results" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><StudentResults /></DashboardLayout></ProtectedRoute>} />

      {/* Shared timetable route */}
      <Route path="/timetable" element={<ProtectedRoute><DashboardLayout><TimetableView /></DashboardLayout></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" />
    </>
  );
}
