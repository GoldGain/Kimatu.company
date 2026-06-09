# EduHub Feature Implementation Plan

This document outlines the identified feature gaps in the EduHub application based on the provided testing tasks and a preliminary audit of the codebase. It also details the plan for implementing these missing features.

## 1. Authentication and Role Hierarchy

**Identified Gap:** The frontend expects `master_super_admin` and `reseller_super_admin` roles, while the Supabase migrations currently assign both master and reseller users to a generic `super_admin` role. This discrepancy can lead to incorrect access control and UI presentation.

**Plan:**
1.  **Update `user_role` Enum:** Ensure the `user_role` enum in Supabase correctly includes `master_super_admin` and `reseller_super_admin` values. The `MULTI_TENANT_MIGRATION.sql` already attempts this, but it needs to be verified and potentially enforced.
2.  **Adjust Supabase Migrations:** Modify `supabase/migrations/20260602_reseller_isolation_and_required_accounts.sql` to correctly assign `master_super_admin` to `martinmakau2005@gmail.com` and `reseller_super_admin` to reseller accounts like `theophillusngewa@gmail.com`.
3.  **Review RLS Policies:** Carefully review and adjust RLS policies in `supabase/migrations/20260602_reseller_isolation_and_required_accounts.sql` and `MULTI_TENANT_MIGRATION.sql` to ensure that:
    *   `master_super_admin` has full access to all data.
    *   `reseller_super_admin` can only access schools and data associated with their `owner_id` or `reseller_id`.
    *   `school_admin`, `teacher`, `student`, and `parent` roles have appropriate, restricted access based on their `school_id`.
4.  **Frontend Role Mapping:** Verify that `src/contexts/AuthContext.tsx` and `src/App.tsx` correctly map the Supabase roles to the frontend's expected roles for UI rendering and route protection.

## 2. Parent-Pay Logic and Reseller Isolation

**Identified Gap:** The Parent-Pay feature is present, but its interaction with reseller-specific settings and data isolation needs thorough verification. Specifically, ensuring that Parent-Pay is enabled/disabled per reseller and that payment keys are correctly associated.

**Plan:**
1.  **Reseller Configuration:** Confirm that the `resellers` table in Supabase (defined in `MULTI_TENANT_MIGRATION.sql`) correctly stores `paystack_public_key`, `paystack_secret_key`, `parent_pay_enabled`, `view_results_fee`, and `pdf_report_fee`.
2.  **School-Level Override:** Verify that `public.schools` table columns `parent_pay_enabled`, `view_results_fee`, and `pdf_report_fee` (from `MULTI_TENANT_MIGRATION.sql`) are correctly used to override reseller settings at the school level if applicable.
3.  **Parent-Pay Flow:** Examine `src/pages/dashboard/parent/Children.tsx` and `src/pages/dashboard/parent/ChildReportCard.tsx` to ensure that:
    *   The correct Paystack public key (reseller's or school's) is used for payments.
    *   The "Pay Ksh 50 to View Results" button appears only when Parent-Pay is enabled for the specific school/reseller.
    *   Payment success correctly unlocks results and updates the `parent_payments` table.
4.  **Data Isolation for Payments:** Confirm RLS policies for `parent_payments` in `MULTI_TENANT_MIGRATION.sql` ensure that resellers only see their own payments, school admins see their school's payments, and parents see their own payments.

## 3. CBC Grading and Report Cards

**Identified Gap:** While CBC grading logic exists in `src/lib/grading.ts`, the report card (`src/pages/dashboard/student/ReportCard.tsx` and `src/pages/dashboard/parent/ChildReportCard.tsx`) still displays 8-4-4 grades, contradicting the requirement for pure CBC grading. The AI comment needs to be personalized.

**Plan:**
1.  **Pure CBC Display:** Modify `src/pages/dashboard/student/ReportCard.tsx` and `src/pages/dashboard/parent/ChildReportCard.tsx` to display **only** CBC grades (e.g., EE2, EE, 7 points) and **remove** any 8-4-4 grade references from the report card PDF generation.
2.  **AI Comment Personalization:** Verify the `generateAIComment` function (likely in `src/pages/dashboard/student/ReportCard.tsx`) generates personalized comments based on student performance, not generic ones.
3.  **Result Storage:** Ensure that the `results` table in Supabase (and the `ResultsUpload.tsx` component) correctly stores and retrieves only the relevant CBC grading components (e.g., `cbc_grade`, `cbc_sublevel`, `cbc_points`, `cbc_descriptor`) and avoids storing 8-4-4 grades if they are not to be displayed.

## 4. Automatic Timetable Generator

**Identified Gap:** The existing timetable functionality (`src/pages/dashboard/teacher/Timetable.tsx` and `src/pages/dashboard/admin/TimetableSetup.tsx`) is manual and lacks the requested automatic generation features, including conflict resolution, morning slot priority for specific subjects, after-school activities, and dynamic slot creation based on school hours.

**Plan:**
1.  **Backend Timetable Generation Logic:** Develop a new backend service or Supabase function (if feasible within Supabase limitations) to implement the automatic timetable generation. This will involve:
    *   Retrieving teacher subject selections and lessons per week.
    *   Retrieving school hours, breaks, and lesson duration from `school_timetable_config`.
    *   Implementing an algorithm to generate a timetable that avoids conflicts, prioritizes Math and English in morning slots, and incorporates after-school activities.
2.  **Teacher Subject Selection UI:** Enhance `src/pages/dashboard/teacher/Timetable.tsx` or create a new component to allow teachers to select subjects and specify lessons per week, as described in the testing tasks.
3.  **School Admin Configuration UI:** Ensure `src/pages/dashboard/admin/TimetableSetup.tsx` allows for comprehensive configuration of school hours, breaks, and lesson duration.
4.  **Frontend Integration:** Integrate the automatic timetable generation with the frontend, allowing school admins to trigger generation and view the resulting timetable.
5.  **PDF Export:** Update the PDF export functionality in `src/pages/dashboard/teacher/Timetable.tsx` (or the new timetable display component) to correctly display the automatically generated timetable in the specified format (days as rows, time slots as columns).

## 5. Deployment and Verification

**Plan:**
1.  **Vercel Deployment:** After implementing the features, deploy the updated application to Vercel using the provided access token and target domain `https://cbe-analytics.com`.
2.  **End-to-End Testing:** Conduct all the verification tests outlined in the `pasted_content.txt` file, ensuring each step passes.
3.  **Screenshot Capture:** Capture all required screenshots (Paystack payment popup, student result, report card, generated timetable PDF).
4.  **Report Generation:** Compile a final report with the "ALL TESTS PASSED" confirmation and all supporting screenshots.
