import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  slot_type: "lesson" | "break" | "lunch" | "activity";
  slot_order: number;
}

interface Assignment {
  teacher_id: string;
  teacher_number: number;
  class_id: string;
  subject_id: string;
  subject_name: string;
  lessons_per_week: number;
  is_priority: boolean;
}

interface TimetableEntry {
  school_id: string;
  class_id: string;
  day_of_week: number;
  time_slot_id: string;
  teacher_id: string;
  teacher_number: number;
  subject_id: string;
  subject_name: string;
  entry_type: "lesson" | "break" | "lunch" | "activity";
}

serve(async (req) => {
  try {
    const { school_id } = await req.json();

    if (!school_id) {
      return new Response(JSON.stringify({ error: "school_id is required" }), {
        status: 400,
      });
    }

    // Fetch school config
    const { data: config, error: configError } = await supabase
      .from("school_timetable_config")
      .select("*")
      .eq("school_id", school_id)
      .single();

    if (configError || !config) {
      return new Response(
        JSON.stringify({ error: "School configuration not found" }),
        { status: 404 }
      );
    }

    // Fetch time slots
    const { data: timeSlots, error: slotsError } = await supabase
      .from("time_slots")
      .select("*")
      .eq("school_id", school_id)
      .order("slot_order");

    if (slotsError || !timeSlots) {
      return new Response(JSON.stringify({ error: "Time slots not found" }), {
        status: 404,
      });
    }

    // Fetch teacher assignments with teacher numbers
    const { data: assignments, error: assignmentsError } = await supabase
      .from("teacher_assignment_details")
      .select("*")
      .eq("school_id", school_id);

    if (assignmentsError || !assignments) {
      return new Response(
        JSON.stringify({ error: "Teacher assignments not found" }),
        { status: 404 }
      );
    }

    // Fetch classes
    const { data: classes, error: classesError } = await supabase
      .from("classes")
      .select("id, name")
      .eq("school_id", school_id);

    if (classesError || !classes) {
      return new Response(JSON.stringify({ error: "Classes not found" }), {
        status: 404,
      });
    }

    // Generate timetable entries
    const timetableEntries: TimetableEntry[] = [];
    const teacherSchedule: Map<string, Set<string>> = new Map(); // teacher_id -> set of "day:slot"

    // First, add breaks and lunches for all classes and days
    for (const cls of classes) {
      for (let day = 0; day < 5; day++) {
        for (const slot of timeSlots) {
          if (slot.slot_type === "break" || slot.slot_type === "lunch") {
            timetableEntries.push({
              school_id,
              class_id: cls.id,
              day_of_week: day,
              time_slot_id: slot.id,
              teacher_id: "",
              teacher_number: 0,
              subject_id: "",
              subject_name: slot.slot_type === "lunch" ? "LUNCH" : "BREAK",
              entry_type: slot.slot_type,
            });
          }
        }
      }
    }

    // Then, schedule lessons
    const lessonSlots = timeSlots.filter((s) => s.slot_type === "lesson");
    const priorityAssignments = assignments.filter((a) => a.is_priority);
    const regularAssignments = assignments.filter((a) => !a.is_priority);

    // Schedule priority subjects (Math, English) in morning slots
    const morningSlots = lessonSlots.slice(0, Math.ceil(lessonSlots.length / 2));

    for (const assignment of priorityAssignments) {
      let lessonsScheduled = 0;

      for (let day = 0; day < 5 && lessonsScheduled < assignment.lessons_per_week; day++) {
        for (const slot of morningSlots) {
          if (lessonsScheduled >= assignment.lessons_per_week) break;

          const scheduleKey = `${assignment.teacher_id}:${day}:${slot.id}`;
          if (!teacherSchedule.has(assignment.teacher_id)) {
            teacherSchedule.set(assignment.teacher_id, new Set());
          }

          const teacherSet = teacherSchedule.get(assignment.teacher_id)!;
          if (!teacherSet.has(`${day}:${slot.id}`)) {
            timetableEntries.push({
              school_id,
              class_id: assignment.class_id,
              day_of_week: day,
              time_slot_id: slot.id,
              teacher_id: assignment.teacher_id,
              teacher_number: assignment.teacher_number,
              subject_id: assignment.subject_id,
              subject_name: assignment.subject_name,
              entry_type: "lesson",
            });

            teacherSet.add(`${day}:${slot.id}`);
            lessonsScheduled++;
          }
        }
      }
    }

    // Schedule regular subjects
    for (const assignment of regularAssignments) {
      let lessonsScheduled = 0;

      for (let day = 0; day < 5 && lessonsScheduled < assignment.lessons_per_week; day++) {
        for (const slot of lessonSlots) {
          if (lessonsScheduled >= assignment.lessons_per_week) break;

          if (!teacherSchedule.has(assignment.teacher_id)) {
            teacherSchedule.set(assignment.teacher_id, new Set());
          }

          const teacherSet = teacherSchedule.get(assignment.teacher_id)!;
          if (!teacherSet.has(`${day}:${slot.id}`)) {
            timetableEntries.push({
              school_id,
              class_id: assignment.class_id,
              day_of_week: day,
              time_slot_id: slot.id,
              teacher_id: assignment.teacher_id,
              teacher_number: assignment.teacher_number,
              subject_id: assignment.subject_id,
              subject_name: assignment.subject_name,
              entry_type: "lesson",
            });

            teacherSet.add(`${day}:${slot.id}`);
            lessonsScheduled++;
          }
        }
      }
    }

    // Clear existing timetable entries
    await supabase.from("timetable_entries").delete().eq("school_id", school_id);

    // Insert new timetable entries
    const { error: insertError } = await supabase
      .from("timetable_entries")
      .insert(timetableEntries);

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
      });
    }

    // Mark timetable as generated
    await supabase
      .from("school_timetable_config")
      .update({ timetable_generated: true, generated_at: new Date().toISOString() })
      .eq("id", config.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Timetable generated successfully",
        entries_created: timetableEntries.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
