import { useState } from 'react';
import { supabase, supabaseUntyped } from '@/lib/supabase/client';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PromoteStudentModalProps {
  student: any;
  classes: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function PromoteStudentModal({
  student,
  classes,
  onClose,
  onSuccess,
}: PromoteStudentModalProps) {
  const [promoting, setPromoting] = useState(false);

  const getNextClass = () => {
    const currentClass = classes.find((c) => c.id === student.class_id);
    if (!currentClass) return null;

    // Find next class by level
    const nextClass = classes.find(
      (c) =>
        c.level === currentClass.level + 1 &&
        c.curriculum === currentClass.curriculum &&
        c.school_id === currentClass.school_id
    );

    return nextClass || null;
  };

  const nextClass = getNextClass();

  const handlePromote = async () => {
    if (!nextClass) {
      toast.error('No next class available for promotion');
      return;
    }

    setPromoting(true);
    try {
      // Update student's class
      const { error: updateError } = await supabaseUntyped
        .from('students')
        .update({ class_id: nextClass.id })
        .eq('id', student.id);

      if (updateError) {
        toast.error('Failed to promote student: ' + updateError.message);
        setPromoting(false);
        return;
      }

      // Record promotion in student_promotions table
      const { error: promotionError } = await supabaseUntyped
        .from('student_promotions')
        .insert({
          student_id: student.id,
          school_id: student.school_id,
          from_class_id: student.class_id,
          to_class_id: nextClass.id,
          promotion_date: new Date().toISOString(),
          academic_year: new Date().getFullYear().toString(),
        });

      if (promotionError) {
        console.warn('Promotion record warning:', promotionError);
        // Don't fail if promotion record fails - student was already promoted
      }

      toast.success(
        `${student.first_name} ${student.last_name} promoted to ${nextClass.name} ${nextClass.stream || ''}`
      );

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error('Error promoting student: ' + error.message);
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-[#111111]">Promote Student</h2>
            <p className="text-sm text-[#666666] mt-1">
              Promote {student.first_name} {student.last_name} to next class?
            </p>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6 space-y-2">
          <div>
            <p className="text-xs text-[#666666] uppercase font-medium">Current Class</p>
            <p className="text-sm font-medium text-[#111111]">
              {classes.find((c) => c.id === student.class_id)?.name || '-'}
            </p>
          </div>
          {nextClass && (
            <div>
              <p className="text-xs text-[#666666] uppercase font-medium">New Class</p>
              <p className="text-sm font-medium text-blue-600">
                {nextClass.name} {nextClass.stream || ''}
              </p>
            </div>
          )}
          {!nextClass && (
            <div className="text-sm text-red-600 font-medium">
              No next class available
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePromote}
            disabled={promoting || !nextClass}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {promoting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Promoting...
              </>
            ) : (
              'Promote'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
