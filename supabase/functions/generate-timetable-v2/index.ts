import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  slot_type: string;
  slot_order: number;
}

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  lessons_per_week: number;
  is_priority: boolean;
}

interface TimetableEntry {
  school_id: string;
  day_of_week: number;
  time_slot_id: string;
  class_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  is_break: boolean;
  is_lunch: boolean;
  is_activity: boolean;
  activity_name: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { schoolId } = body;

    if (!schoolId) {
      return new Response(JSON.stringify({ error: "Missing schoolId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get school config
    const { data: config, error: configError } = await adminClient
      .from("school_timetable_config")
      .select("*")
      .eq("school_id", schoolId)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "School config not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Generate time slots
    const timeSlots = generateTimeSlots(config);

    // 3. Get classes
    const { data: classes } = await adminClient
      .from("classes")
      .select("*")
      .eq("school_id", schoolId);

    if (!classes || classes.length === 0) {
      return new Response(JSON.stringify({ error: "No classes found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Get teacher assignments
    const { data: assignments } = await adminClient
      .from("teacher_subject_assignments")
      .select("*");

    if (!assignments || assignments.length === 0) {
      return new Response(JSON.stringify({ error: "No teacher assignments found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Get after-school activities
    const { data: activities } = await adminClient
      .from("after_school_activities")
      .select("*")
      .eq("school_id", schoolId);

    // 6. Generate timetable entries
    const entries: TimetableEntry[] = [];
    const teacherSchedule: Record<string, Set<string>> = {};
    const classSchedule: Record<string, Set<string>> = {};

    // Initialize schedules
    for (const assignment of assignments) {
      if (!teacherSchedule[assignment.teacher_id]) {
        teacherSchedule[assignment.teacher_id] = new Set();
      }
    }
    for (const cls of classes) {
      classSchedule[cls.id] = new Set();
    }

    // Generate entries for each day
    for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
      for (const slot of timeSlots) {
        const slotKey = `${dayOfWeek}-${slot.id}`;

        if (slot.slot_type === "break") {
          // Add break for all classes
          for (const cls of classes) {
            entries.push({
              school_id: schoolId,
              day_of_week: dayOfWeek,
              time_slot_id: slot.id,
              class_id: cls.id,
              subject_id: null,
              teacher_id: null,
              is_break: true,
              is_lunch: false,
              is_activity: false,
              activity_name: null,
            });
          }
        } else if (slot.slot_type === "lunch") {
          // Add lunch for all classes
          for (const cls of classes) {
            entries.push({
              school_id: schoolId,
              day_of_week: dayOfWeek,
              time_slot_id: slot.id,
              class_id: cls.id,
              subject_id: null,
              teacher_id: null,
              is_break: false,
              is_lunch: true,
              is_activity: false,
              activity_name: null,
            });
          }
        } else if (slot.slot_type === "activity") {
          // Add after-school activities
          const activity = activities?.find(a => a.day_of_week === dayOfWeek);
          if (activity) {
            for (const cls of classes) {
              entries.push({
                school_id: schoolId,
                day_of_week: dayOfWeek,
                time_slot_id: slot.id,
                class_id: cls.id,
                subject_id: null,
                teacher_id: null,
                is_break: false,
                is_lunch: false,
                is_activity: true,
                activity_name: activity.activity_name,
              });
            }
          }
        } else if (slot.slot_type === "lesson") {
          // Assign lessons
          // Priority: Math and English in morning slots
          const isMorning = parseInt(slot.start_time.split(":")[0]) < 12;

          // First pass: assign priority subjects to morning slots
          if (isMorning) {
            for (const cls of classes) {
              const priorityAssignments = assignments.filter(
                a => a.class_id === cls.id && a.is_priority && !classSchedule[cls.id].has(slotKey)
              );

              for (const assignment of priorityAssignments) {
                const teacherFree = !teacherSchedule[assignment.teacher_id]?.has(slotKey);
                if (teacherFree) {
                  entries.push({
                    school_id: schoolId,
                    day_of_week: dayOfWeek,
                    time_slot_id: slot.id,
                    class_id: cls.id,
                    subject_id: assignment.subject_id,
                    teacher_id: assignment.teacher_id,
                    is_break: false,
                    is_lunch: false,
                    is_activity: false,
                    activity_name: null,
                  });
                  teacherSchedule[assignment.teacher_id].add(slotKey);
                  classSchedule[cls.id].add(slotKey);
                  break;
                }
              }
            }
          }

          // Second pass: assign other subjects
          for (const cls of classes) {
            if (!classSchedule[cls.id].has(slotKey)) {
              const availableAssignments = assignments.filter(
                a => a.class_id === cls.id && !classSchedule[cls.id].has(slotKey)
              );

              for (const assignment of availableAssignments) {
                const teacherFree = !teacherSchedule[assignment.teacher_id]?.has(slotKey);
                if (teacherFree) {
                  entries.push({
                    school_id: schoolId,
                    day_of_week: dayOfWeek,
                    time_slot_id: slot.id,
                    class_id: cls.id,
                    subject_id: assignment.subject_id,
                    teacher_id: assignment.teacher_id,
                    is_break: false,
                    is_lunch: false,
                    is_activity: false,
                    activity_name: null,
                  });
                  teacherSchedule[assignment.teacher_id].add(slotKey);
                  classSchedule[cls.id].add(slotKey);
                  break;
                }
              }
            }
          }
        }
      }
    }

    // 7. Delete existing entries and insert new ones
    await adminClient.from("timetable_entries").delete().eq("school_id", schoolId);

    const { error: insertError } = await adminClient
      .from("timetable_entries")
      .insert(entries);

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Timetable generated successfully",
        entriesCount: entries.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + (err as any).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function generateTimeSlots(config: any): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = config.school_start_time.split(":").map(Number);
  const [endH, endM] = config.school_end_time.split(":").map(Number);
  const [mbStartH, mbStartM] = config.morning_break_start.split(":").map(Number);
  const [mbEndH, mbEndM] = config.morning_break_end.split(":").map(Number);
  const [lStartH, lStartM] = config.lunch_start.split(":").map(Number);
  const [lEndH, lEndM] = config.lunch_end.split(":").map(Number);
  const [abStartH, abStartM] = config.afternoon_break_start.split(":").map(Number);
  const [abEndH, abEndM] = config.afternoon_break_end.split(":").map(Number);

  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const mbStart = mbStartH * 60 + mbStartM;
  const mbEnd = mbEndH * 60 + mbEndM;
  const lStart = lStartH * 60 + lStartM;
  const lEnd = lEndH * 60 + lEndM;
  const abStart = abStartH * 60 + abStartM;
  const abEnd = abEndH * 60 + abEndM;

  let currentMin = startMin;
  let slotOrder = 1;

  while (currentMin < endMin) {
    // Check for breaks and lunch
    if (currentMin === mbStart) {
      slots.push({
        id: `slot_${slotOrder}`,
        start_time: formatTime(currentMin),
        end_time: formatTime(mbEnd),
        slot_type: "break",
        slot_order: slotOrder,
      });
      currentMin = mbEnd;
      slotOrder++;
    } else if (currentMin === lStart) {
      slots.push({
        id: `slot_${slotOrder}`,
        start_time: formatTime(currentMin),
        end_time: formatTime(lEnd),
        slot_type: "lunch",
        slot_order: slotOrder,
      });
      currentMin = lEnd;
      slotOrder++;
    } else if (currentMin === abStart) {
      slots.push({
        id: `slot_${slotOrder}`,
        start_time: formatTime(currentMin),
        end_time: formatTime(abEnd),
        slot_type: "break",
        slot_order: slotOrder,
      });
      currentMin = abEnd;
      slotOrder++;
    } else if (currentMin + config.lesson_duration_minutes <= endMin) {
      // Check if this is after-school activity time
      if (currentMin >= abEnd) {
        slots.push({
          id: `slot_${slotOrder}`,
          start_time: formatTime(currentMin),
          end_time: formatTime(Math.min(currentMin + config.lesson_duration_minutes, endMin)),
          slot_type: "activity",
          slot_order: slotOrder,
        });
      } else {
        slots.push({
          id: `slot_${slotOrder}`,
          start_time: formatTime(currentMin),
          end_time: formatTime(currentMin + config.lesson_duration_minutes),
          slot_type: "lesson",
          slot_order: slotOrder,
        });
      }
      currentMin += config.lesson_duration_minutes;
      slotOrder++;
    } else {
      break;
    }
  }

  return slots;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}
