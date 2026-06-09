/**
 * Shared timetable generation logic
 * Break order: Lesson 1&2 → FIRST BREAK → Lesson 3&4 → SECOND BREAK → Lesson 5&6 → LUNCH → Lesson 7&8 → ACTIVITIES
 */

export interface TimetableSlot {
  slot_order: number;
  label: string;
  slot_type: 'lesson' | 'break' | 'lunch' | 'activities';
  start_time: string;
  end_time: string;
}

export interface TimetableConfig {
  lesson_duration: number;
  first_break_start: string;
  first_break_end: string;
  second_break_start: string;
  second_break_end: string;
  lunch_start: string;
  lunch_end: string;
  school_start?: string;
  school_end?: string;
  activities?: Record<string, string>;
}

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/**
 * Generate time slots following the exact break order from the timetable image:
 * Lesson 1 → Lesson 2 → FIRST BREAK → Lesson 3 → Lesson 4 → SECOND BREAK → Lesson 5 → Lesson 6 → LUNCH → Lesson 7 → Lesson 8 → ACTIVITIES
 */
export function generateSlots(config: TimetableConfig): TimetableSlot[] {
  const duration = config.lesson_duration || 40;
  const schoolStart = config.school_start || '08:20';
  let currentMinutes = timeToMinutes(schoolStart);
  const slots: TimetableSlot[] = [];

  // Lesson 1
  slots.push({
    slot_order: 1,
    label: 'Lesson 1',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // Lesson 2
  slots.push({
    slot_order: 2,
    label: 'Lesson 2',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // FIRST BREAK (after lesson 2)
  slots.push({
    slot_order: 3,
    label: 'FIRST BREAK',
    slot_type: 'break',
    start_time: config.first_break_start,
    end_time: config.first_break_end,
  });
  currentMinutes = timeToMinutes(config.first_break_end);

  // Lesson 3
  slots.push({
    slot_order: 4,
    label: 'Lesson 3',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // Lesson 4
  slots.push({
    slot_order: 5,
    label: 'Lesson 4',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // SECOND BREAK (after lesson 4)
  slots.push({
    slot_order: 6,
    label: 'SECOND BREAK',
    slot_type: 'break',
    start_time: config.second_break_start,
    end_time: config.second_break_end,
  });
  currentMinutes = timeToMinutes(config.second_break_end);

  // Lesson 5
  slots.push({
    slot_order: 7,
    label: 'Lesson 5',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // Lesson 6
  slots.push({
    slot_order: 8,
    label: 'Lesson 6',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // LUNCH (after lesson 6)
  slots.push({
    slot_order: 9,
    label: 'LUNCH',
    slot_type: 'lunch',
    start_time: config.lunch_start,
    end_time: config.lunch_end,
  });
  currentMinutes = timeToMinutes(config.lunch_end);

  // Lesson 7
  slots.push({
    slot_order: 10,
    label: 'Lesson 7',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // Lesson 8
  slots.push({
    slot_order: 11,
    label: 'Lesson 8',
    slot_type: 'lesson',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });
  currentMinutes += duration;

  // ACTIVITIES (after lesson 8)
  slots.push({
    slot_order: 12,
    label: 'ACTIVITIES',
    slot_type: 'activities',
    start_time: minutesToTime(currentMinutes),
    end_time: minutesToTime(currentMinutes + duration),
  });

  return slots;
}

/**
 * Get activity name for a specific day from config
 */
export function getActivityForDay(config: TimetableConfig | null, day: number): string {
  if (!config?.activities) return 'Activity';
  return config.activities[day] || config.activities[String(day)] || 'Activity';
}

/**
 * Format time for display (e.g., "08:20" → "8:20")
 */
export function formatTimeDisplay(time: string): string {
  if (!time) return '';
  const [h, m] = time.split(':');
  const hour = Number(h);
  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${hour12}:${m}`;
}

/**
 * Format time range for header display
 */
export function formatTimeRange(start: string, end: string): string {
  return `${formatTimeDisplay(start)}–${formatTimeDisplay(end)}`;
}
