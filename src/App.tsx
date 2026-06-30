import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Loader2 } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

// ─── Auth Pages ──────────────────────────────────────────────
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import ForgotPassword from '@/pages/auth/ForgotPassword';
import ResetPassword from '@/pages/auth/ResetPassword';

// ─── Public Pages ────────────────────────────────────────────
import Landing from '@/pages/Landing';
import GetStarted from '@/pages/GetStarted';

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
import SchoolAdminFees from '@/pages/dashboard/school-admin/Fees';
import SchoolAdminAnnouncements from '@/pages/dashboard/school-admin/Announcements';
import SchoolAdminBranding from '@/pages/dashboard/school-admin/Branding';
import SchoolAdminAssignTeachers from '@/pages/dashboard/school-admin/AssignTeachers';
import SchoolAdminTimetableSetup from '@/pages/dashboard/school-admin/TimetableSetup';
import SchoolAdminTimetableGenerate from '@/pages/dashboard/school-admin/TimetableGenerate';
import SchoolAdminProfile from '@/pages/dashboard/school-admin/Profile';
import SchoolAdminChangePassword from '@/pages/dashboard/school-admin/ChangePassword';
import SchoolAdminReportCards from '@/pages/dashboard/school-admin/ReportCards';
import SchoolAdminAttendance from '@/pages/dashboard/school-admin/Attendance';
import SchoolAdminLibrary from '@/pages/dashboard/school-admin/Library';
import SchoolAdminStreamDashboard from '@/pages/dashboard/school-admin/StreamDashboard';

// ─── Dean of Studies Pages ───────────────────────────────────
import DeanOfStudiesDashboard from '@/pages/dashboard/dean-of-studies/Dashboard';

// ─── Teacher Pages ───────────────────────────────────────────
import TeacherDashboard from '@/pages/dashboard/teacher/Dashboard';
import TeacherResultsUpload from '@/pages/dashboard/teacher/ResultsUpload';
import TeacherStudents from '@/pages/dashboard/teacher/Students';
import TeacherAnalytics from '@/pages/dashboard/teacher/Analytics';
import TeacherCATs from '@/pages/dashboard/teacher/CATs';
import TeacherTimetable from '@/pages/dashboard/teacher/Timetable';
import TeacherProfile from '@/pages/dashboard/teacher/Profile';
import TeacherChangePassword from '@/pages/dashboard/teacher/ChangePassword';
import TeacherAssignments from '@/pages/dashboard/teacher/Assignments';

// ─── Student Pages ───────────────────────────────────────────
import StudentDashboard from '@/pages/dashboard/student/Dashboard';
import StudentResults from '@/pages/dashboard/student/Results';
import StudentReportCard from '@/pages/dashboard/student/ReportCard';
import StudentFees from '@/pages/dashboard/student/Fees';
import StudentTimetable from '@/pages/dashboard/student/Timetable';
import StudentAttendance from '@/pages/dashboard/student/Attendance';
import StudentHomework from '@/pages/dashboard/student/Homework';
import StudentChangePassword from '@/pages/dashboard/student/ChangePassword';
import StudentAssignments from '@/pages/dashboard/student/Assignments';
import StudentLibrary from '@/pages/dashboard/student/Library';
import StudentProfile from '@/pages/dashboard/student/Profile';

// ─── Parent Pages ────────────────────────────────────────────
import ParentDashboard from '@/pages/dashboard/parent/Dashboard';
import ParentChild from '@/pages/dashboard/parent/Child';
import ParentChildReportCard from '@/pages/dashboard/parent/ChildReportCard';
import ParentFeeTranscript from '@/pages/dashboard/parent/FeeTranscript';
import ParentChildren from '@/pages/dashboard/parent/Children';
import ParentProfile from '@/pages/dashboard/parent/Profile';
import ParentChangePassword from '@/pages/dashboard/parent/ChangePassword';
import ParentAttendance from '@/pages/dashboard/parent/Attendance';
import ParentAnnouncements from '@/pages/dashboard/parent/Announcements';
import ParentFees from '@/pages/dashboard/parent/Fees';

// ─── Shared Pages ────────────────────────────────────────────
import TimetableView from '@/pages/dashboard/TimetableView';

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
      {/* ═══ PUBLIC ROUTES ═══ */}
      <Route path="/" element={<Landing />} />
      <Route path="/get-started" element={<GetStarted />} />
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/register" element={<Register />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />

      {/* ═══ SCHOOL ADMIN ROUTES ═══ */}
      <Route path="/school-admin" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/students" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminStudents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/teachers" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminTeachers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/classes" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminClasses /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/subjects" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminSubjects /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/exams" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminExams /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/assessments" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminAssessments /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/assign-roles" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminAssignRoles /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/bulk-sms" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminBulkSMS /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/fees" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminFees /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/announcements" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminAnnouncements /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/branding" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminBranding /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/assign-teachers" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminAssignTeachers /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/timetable/setup" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminTimetableSetup /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/timetable/generate" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminTimetableGenerate /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/profile" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminProfile /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/change-password" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminChangePassword /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/report-cards" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminReportCards /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/attendance" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminAttendance /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/library" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminLibrary /></DashboardLayout></ProtectedRoute>} />
      <Route path="/school-admin/stream-dashboard" element={<ProtectedRoute allowedRoles={['school_admin']}><DashboardLayout><SchoolAdminStreamDashboard /></DashboardLayout></ProtectedRoute>} />

      {/* ═══ DEAN OF STUDIES ROUTES ═══ */}
      <Route path="/dean-of-studies" element={<ProtectedRoute allowedRoles={['teacher', 'school_admin']}><DashboardLayout><DeanOfStudiesDashboard /></DashboardLayout></ProtectedRoute>} />

      {/* ═══ TEACHER ROUTES ═══ */}
      <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/upload-results" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherResultsUpload /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherStudents /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/cats" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherCATs /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/analytics" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherAnalytics /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/timetable" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherTimetable /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/profile" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherProfile /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/change-password" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherChangePassword /></DashboardLayout></ProtectedRoute>} />
      <Route path="/teacher/assignments" element={<ProtectedRoute allowedRoles={['teacher']}><DashboardLayout><TeacherAssignments /></DashboardLayout></ProtectedRoute>} />

      {/* ═══ STUDENT ROUTES ═══ */}
      <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/results" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentResults /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/report-card" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentReportCard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentFees /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentTimetable /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAttendance /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/homework" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentHomework /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/change-password" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentChangePassword /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAssignments /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/library" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLibrary /></DashboardLayout></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentProfile /></DashboardLayout></ProtectedRoute>} />

      {/* ═══ PARENT ROUTES ═══ */}
      <Route path="/parent" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentDashboard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/child" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentChild /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/child-report-card" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentChildReportCard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/fee-transcript" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentFeeTranscript /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/children" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentChildren /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/profile" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentProfile /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/change-password" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentChangePassword /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/attendance" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentAttendance /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/announcements" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentAnnouncements /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/fees" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentFees /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/results" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><ParentChildReportCard /></DashboardLayout></ProtectedRoute>} />
      <Route path="/parent/report-card" element={<ProtectedRoute allowedRoles={['parent']}><DashboardLayout><Navigate to="/parent/child-report-card" replace /></DashboardLayout></ProtectedRoute>} />

      {/* ═══ SHARED ROUTES ═══ */}
      <Route path="/timetable" element={<ProtectedRoute><DashboardLayout><TimetableView /></DashboardLayout></ProtectedRoute>} />

      {/* ═══ FALLBACK ═══ */}
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
