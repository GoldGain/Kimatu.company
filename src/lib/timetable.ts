/**
 * Kimatu Analytics – Timetable Workload Distribution Engine
 * Handles intelligent lesson distribution across the week,
 * respects teacher unavailability, and supports smart rebalancing.
 */

export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
export type Day = (typeof DAYS)[number];

export interface TeacherAvailability {
  teacherId: string;
  availableDays: Record<Day, boolean>;
  totalLessonsPerWeek: number;
}

export interface LessonDistribution {
  day: Day;
  lessons: number;
  label: string;
}

/**
 * Distribute lessons evenly across available days.
 * Remainder lessons are placed on the earliest available days.
 */
export const distributeLessons = (
  availability: TeacherAvailability
): LessonDistribution[] => {
  const availableDays = DAYS.filter((d) => availability.availableDays[d]);

  if (availableDays.length === 0) {
    // Return all days with 0 lessons
    return DAYS.map((d) => ({ day: d, lessons: 0, label: capitalize(d) }));
  }

  const total = availability.totalLessonsPerWeek;
  const perDay = Math.floor(total / availableDays.length);
  const remainder = total % availableDays.length;

  const distribution: Record<Day, number> = {
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    friday: 0,
  };

  availableDays.forEach((day, index) => {
    distribution[day] = index < remainder ? perDay + 1 : perDay;
  });

  return DAYS.map((d) => ({
    day: d,
    lessons: distribution[d],
    label: capitalize(d),
  }));
};

/**
 * Rebalance lessons after an admin manually changes a day's count.
 * Ensures total lesson count stays consistent.
 * Returns the updated distribution and a suggestion message.
 */
export const rebalanceLessons = (
  currentDistribution: LessonDistribution[],
  targetTotal: number
): { distribution: LessonDistribution[]; message: string | null } => {
  const currentTotal = currentDistribution.reduce((sum, d) => sum + d.lessons, 0);
  const diff = targetTotal - currentTotal;

  if (diff === 0) {
    return { distribution: currentDistribution, message: null };
  }

  // Days that can absorb changes (lessons > 0 for reduction, any for addition)
  const adjustable = currentDistribution.filter((d) =>
    diff > 0 ? true : d.lessons > 0
  );

  if (adjustable.length === 0) {
    return {
      distribution: currentDistribution,
      message: `Cannot rebalance: no available days to adjust.`,
    };
  }

  const updated = currentDistribution.map((d) => ({ ...d }));
  let remaining = Math.abs(diff);

  // Distribute the difference across adjustable days (round-robin)
  for (let i = 0; remaining > 0; i++) {
    const idx = i % adjustable.length;
    const dayIdx = updated.findIndex((d) => d.day === adjustable[idx].day);
    if (dayIdx === -1) continue;
    if (diff > 0) {
      updated[dayIdx].lessons += 1;
    } else {
      if (updated[dayIdx].lessons > 0) {
        updated[dayIdx].lessons -= 1;
      }
    }
    remaining--;
  }

  const verb = diff > 0 ? 'added' : 'removed';
  const abs = Math.abs(diff);
  const message = `${abs} lesson${abs !== 1 ? 's' : ''} ${verb} and redistributed across available days.`;

  return { distribution: updated, message };
};

/**
 * Validate that total lessons in distribution equals expected total.
 */
export const validateDistribution = (
  distribution: LessonDistribution[],
  expectedTotal: number
): { valid: boolean; actual: number; message: string } => {
  const actual = distribution.reduce((sum, d) => sum + d.lessons, 0);
  const valid = actual === expectedTotal;
  return {
    valid,
    actual,
    message: valid
      ? 'Lesson count is balanced.'
      : `Imbalance detected: ${actual} lessons assigned but ${expectedTotal} expected.`,
  };
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
