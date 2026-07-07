import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TimeSlot {
  day: string;
  startTime: string;
  endTime: string;
  classId: string;
  subjectId: string;
  teacherId: string;
}

interface TimetableConfig {
  schoolStartTime: string; // "08:20"
  schoolEndTime: string; // "16:20"
  lessonDuration: number; // 40 minutes
  breaks: Array<{ name: string; startTime: string; endTime: string }>;
}

interface TeacherSubject {
  teacherId: string;
  subjectId: string;
  lessonsPerWeek: number;
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
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller's token
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

    // Check caller role (school_admin or super_admin)
    const { data: callerProfile } = await callerClient
      .from("profiles")
      .select("role, school_id")
      .eq("id", callerUser.id)
      .single();

    if (!callerProfile || !["school_admin", "super_admin", "reseller_super_admin", "master_super_admin"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { schoolId, term, academicYear } = body;

    if (!schoolId || !term || !academicYear) {
      return new Response(JSON.stringify({ error: "Missing required fields: schoolId, term, academicYear" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to read and write timetable data
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Fetch school timetable config
    const { data: configData } = await adminClient
      .from("school_timetable_config")
      .select("*")
      .eq("school_id", schoolId)
      .single();

    if (!configData) {
      return new Response(JSON.stringify({ error: "School timetable config not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const config: TimetableConfig = {
      schoolStartTime: configData.school_start_time || "08:20",
      schoolEndTime: configData.school_end_time || "16:20",
      lessonDuration: configData.lesson_duration || 40,
      breaks: configData.breaks || [],
    };

    // 2. Fetch all classes for the school
    const { data: classes } = await adminClient
      .from("classes")
      .select("*")
      .eq("school_id", schoolId);

    if (!classes || classes.length === 0) {
      return new Response(JSON.stringify({ error: "No classes found for this school" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Fetch teacher subjects and lessons per week
    const { data: teacherSubjects } = await adminClient
      .from("teacher_subjects")
      .select("teacher_id, subject_id, lessons_per_week")
      .eq("school_id", schoolId);

    if (!teacherSubjects || teacherSubjects.length === 0) {
      return new Response(JSON.stringify({ error: "No teacher subjects configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Generate time slots (Monday-Friday, excluding breaks)
    const timeSlots = generateTimeSlots(config);

    // 5. Generate timetable using a simple greedy algorithm
    const timetable = generateTimetable(
      classes,
      teacherSubjects,
      timeSlots,
      config
    );

    // 6. Save timetable to database
    const { error: saveError } = await adminClient
      .from("timetable_generated")
      .upsert({
        school_id: schoolId,
        term,
        academic_year: academicYear,
        timetable_data: timetable,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "school_id,term,academic_year"
      });

    if (saveError) {
      return new Response(JSON.stringify({ error: "Failed to save timetable: " + saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Timetable generated successfully",
        timetable: timetable
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error: " + (err as any).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function generateTimeSlots(config: TimetableConfig): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  
  // Parse times
  const [startHour, startMin] = config.schoolStartTime.split(":").map(Number);
  const [endHour, endMin] = config.schoolEndTime.split(":").map(Number);
  
  let currentTime = startHour * 60 + startMin; // in minutes
  const endTime = endHour * 60 + endMin;
  
  for (const day of days) {
    currentTime = startHour * 60 + startMin; // reset for each day
    
    while (currentTime + config.lessonDuration <= endTime) {
      // Check if this time is during a break
      const isBreak = config.breaks.some(b => {
        const [bStartH, bStartM] = b.startTime.split(":").map(Number);
        const [bEndH, bEndM] = b.endTime.split(":").map(Number);
        const bStart = bStartH * 60 + bStartM;
        const bEnd = bEndH * 60 + bEndM;
        return currentTime >= bStart && currentTime < bEnd;
      });
      
      if (!isBreak) {
        const startHours = Math.floor(currentTime / 60);
        const startMins = currentTime % 60;
        const endHours = Math.floor((currentTime + config.lessonDuration) / 60);
        const endMins = (currentTime + config.lessonDuration) % 60;
        
        slots.push({
          day,
          startTime: `${String(startHours).padStart(2, "0")}:${String(startMins).padStart(2, "0")}`,
          endTime: `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`,
          classId: "",
          subjectId: "",
          teacherId: "",
        });
      }
      
      currentTime += config.lessonDuration;
    }
  }
  
  return slots;
}

function generateTimetable(
  classes: any[],
  teacherSubjects: any[],
  slots: TimeSlot[],
  config: TimetableConfig
): Record<string, any> {
  const timetable: Record<string, any> = {};
  const teacherSchedule: Record<string, Set<string>> = {};
  const classSchedule: Record<string, Set<string>> = {};
  
  // Initialize schedules
  for (const ts of teacherSubjects) {
    teacherSchedule[ts.teacher_id] = new Set();
  }
  for (const cls of classes) {
    classSchedule[cls.id] = new Set();
  }
  
  // Priority subjects (morning slots preferred)
  const prioritySubjects = ["Mathematics", "English", "Math", "English Language"];
  
  // Assign lessons
  for (const cls of classes) {
    timetable[cls.id] = {};
    
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]) {
      timetable[cls.id][day] = [];
    }
    
    // Get subjects for this class
    const classTeachers = teacherSubjects.filter(ts => {
      // Assume teacher_subjects has a class_id or we need to infer it
      return true; // Simplified for now
    });
    
    // Assign lessons for this class
    for (const ts of classTeachers) {
      let lessonsAssigned = 0;
      
      for (const slot of slots) {
        if (lessonsAssigned >= ts.lessons_per_week) break;
        
        const slotKey = `${slot.day}-${slot.startTime}`;
        const isTeacherFree = !teacherSchedule[ts.teacher_id].has(slotKey);
        const isClassFree = !classSchedule[cls.id].has(slotKey);
        
        if (isTeacherFree && isClassFree) {
          // Prefer morning for priority subjects
          const isMorning = parseInt(slot.startTime.split(":")[0]) < 12;
          const isPriority = prioritySubjects.some(s => ts.subject_id?.includes(s));
          
          if (!isPriority || isMorning) {
            timetable[cls.id][slot.day].push({
              startTime: slot.startTime,
              endTime: slot.endTime,
              subject: ts.subject_id,
              teacher: ts.teacher_id,
            });
            
            teacherSchedule[ts.teacher_id].add(slotKey);
            classSchedule[cls.id].add(slotKey);
            lessonsAssigned++;
          }
        }
      }
    }
  }
  
  return timetable;
}
