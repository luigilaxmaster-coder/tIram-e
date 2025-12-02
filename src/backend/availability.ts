import { BaseCrudService } from '@/integrations';
import { Providers, Services, Appointments, SlotLocks, ProviderWorkingHours } from '@/entities';
import { parseISO, addMinutes, format, startOfDay, addDays, getDay } from 'date-fns';
const SLOT_INTERVAL_MIN = 30;

interface AvailabilitySlot {
  startAtISO: string;
  endAtISO: string;
}

interface DayAvailability {
  date: string;
  slots: AvailabilitySlot[];
}

export async function getProviderBySlug(slug: string) {
  const { items: providers } = await BaseCrudService.getAll<Providers>('providers');
  const provider = providers.find((p) => p.slug === slug && p.isActive);

  if (!provider) {
    throw new Error('Provider not found');
  }

  const { items: allServices } = await BaseCrudService.getAll<Services>('services');
  const services = allServices.filter((s) => s._id.startsWith(provider._id) && s.isActive !== false);

  return { provider, services };
}

export async function listActiveServices(providerId: string, filters?: any) {
  const { items: allServices } = await BaseCrudService.getAll<Services>('services');
  let services = allServices.filter((s) => s._id.startsWith(providerId) && s.isActive !== false);

  if (filters) {
    if (filters.category) {
      services = services.filter((s) => s.category === filters.category);
    }
    if (filters.minDuration) {
      services = services.filter((s) => s.durationMin && s.durationMin >= filters.minDuration);
    }
    if (filters.maxDuration) {
      services = services.filter((s) => s.durationMin && s.durationMin <= filters.maxDuration);
    }
  }

  return services;
}

/**
 * Get working hours for a provider on a specific day
 */
async function getWorkingHoursForDay(providerId: string, dayOfWeek: number): Promise<{ startHour: number; startMin: number; endHour: number; endMin: number } | null> {
  const { items: allWorkingHours } = await BaseCrudService.getAll<ProviderWorkingHours>('workinghours');
  const workingHour = allWorkingHours.find(
    (wh) => wh.providerId === providerId && wh.dayOfWeek === dayOfWeek && wh.isActive !== false
  );

  if (!workingHour || !workingHour.startTime || !workingHour.endTime) {
    return null;
  }

  // Parse time strings (format: "HH:mm")
  let startTimeStr = workingHour.startTime;
  let endTimeStr = workingHour.endTime;

  // Handle case where time might be an object with hours/minutes properties
  if (typeof startTimeStr === 'object' && startTimeStr !== null) {
    startTimeStr = `${String(startTimeStr.hours || 0).padStart(2, '0')}:${String(startTimeStr.minutes || 0).padStart(2, '0')}`;
  }
  if (typeof endTimeStr === 'object' && endTimeStr !== null) {
    endTimeStr = `${String(endTimeStr.hours || 0).padStart(2, '0')}:${String(endTimeStr.minutes || 0).padStart(2, '0')}`;
  }

  // Ensure strings are in correct format
  if (typeof startTimeStr !== 'string' || typeof endTimeStr !== 'string') {
    console.warn(`Invalid time format for provider ${providerId} on day ${dayOfWeek}:`, { startTimeStr, endTimeStr });
    return null;
  }

  const [startHour, startMin] = startTimeStr.split(':').map(Number);
  const [endHour, endMin] = endTimeStr.split(':').map(Number);

  // Validate parsed values
  if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
    console.warn(`Failed to parse time for provider ${providerId} on day ${dayOfWeek}:`, { startTimeStr, endTimeStr });
    return null;
  }

  return { startHour, startMin, endHour, endMin };
}

export async function getWeekAvailability(
  providerId: string,
  serviceId: string,
  weekStartISO: string
): Promise<DayAvailability[]> {
  // Get service details
  const service = await BaseCrudService.getById<Services>('services', serviceId);
  if (!service) {
    throw new Error('Service not found');
  }

  const weekStart = parseISO(weekStartISO);
  const weekEnd = addDays(weekStart, 7);

  // Get all appointments and slot locks for the week
  const { items: allAppointments } = await BaseCrudService.getAll<Appointments>('appointments');
  const appointments = allAppointments.filter((a) => {
    if (a.providerId !== providerId || a.status === 'CANCELLED') return false;
    if (!a.startAt || !a.endAt) return false;
    const start = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
    const end = typeof a.endAt === 'string' ? parseISO(a.endAt) : a.endAt;
    return start < weekEnd && end > weekStart;
  });

  const { items: allLocks } = await BaseCrudService.getAll<SlotLocks>('slotlocks');
  const locks = allLocks.filter((l) => {
    if (l.providerId !== providerId) return false;
    if (!l.startAt || !l.endAt) return false;
    const start = typeof l.startAt === 'string' ? parseISO(l.startAt) : l.startAt;
    const end = typeof l.endAt === 'string' ? parseISO(l.endAt) : l.endAt;
    return start < weekEnd && end > weekStart;
  });

  // Build busy periods
  const busyPeriods: Array<{ start: Date; end: Date }> = [];

  appointments.forEach((a) => {
    const start = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt!;
    const end = typeof a.endAt === 'string' ? parseISO(a.endAt) : a.endAt!;
    busyPeriods.push({ start, end });
  });

  locks.forEach((l) => {
    const start = typeof l.startAt === 'string' ? parseISO(l.startAt) : l.startAt!;
    const end = typeof l.endAt === 'string' ? parseISO(l.endAt) : l.endAt!;
    busyPeriods.push({ start, end });
  });

  // Parse service schedule if available
  let serviceSchedule: Array<{ dayOfWeek: number; isActive: boolean; startTime: string; endTime: string }> | null = null;
  if (service.serviceSchedule) {
    try {
      serviceSchedule = JSON.parse(service.serviceSchedule);
    } catch {
      serviceSchedule = null;
    }
  }

  // Generate availability for each day
  const availability: DayAvailability[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = addDays(weekStart, dayOffset);
    const dayStart = startOfDay(currentDay);
    const dayOfWeek = getDay(currentDay); // 0 = Sunday, 1 = Monday, etc.

    const slots: AvailabilitySlot[] = [];

    // Get working hours - prefer service schedule, fallback to provider schedule
    let workingHours: { startHour: number; startMin: number; endHour: number; endMin: number } | null = null;

    if (serviceSchedule) {
      const serviceDay = serviceSchedule.find((d) => d.dayOfWeek === dayOfWeek);
      if (serviceDay && serviceDay.isActive) {
        const [startHour, startMin] = serviceDay.startTime.split(':').map(Number);
        const [endHour, endMin] = serviceDay.endTime.split(':').map(Number);
        workingHours = { startHour, startMin, endHour, endMin };
      }
    } else {
      // Fallback to provider working hours
      workingHours = await getWorkingHoursForDay(providerId, dayOfWeek);
    }

    if (!workingHours) {
      // No working hours defined for this day, skip it
      availability.push({
        date: format(currentDay, 'yyyy-MM-dd'),
        slots: [],
      });
      continue;
    }

    const { startHour, startMin, endHour, endMin } = workingHours;

    // Calculate slot duration
    const totalDuration =
      (service.durationMin || 30) +
      (service.bufferBeforeMin || 0) +
      (service.bufferAfterMin || 0);

    // Convert working hours to minutes for easier calculation
    const workStartMinutes = startHour * 60 + startMin;
    const workEndMinutes = endHour * 60 + endMin;

    // Generate slots based on working hours
    for (let slotMinutes = workStartMinutes; slotMinutes + totalDuration <= workEndMinutes; slotMinutes += SLOT_INTERVAL_MIN) {
      const slotHour = Math.floor(slotMinutes / 60);
      const slotMin = slotMinutes % 60;

      const slotStart = new Date(dayStart);
      slotStart.setHours(slotHour, slotMin, 0, 0);

      const slotEnd = addMinutes(slotStart, totalDuration);

      // Check if slot is in the past
      if (slotStart < new Date()) {
        continue;
      }

      // Check for overlaps with busy periods
      const isOverlapping = busyPeriods.some((busy) => {
        return slotStart < busy.end && slotEnd > busy.start;
      });

      if (!isOverlapping) {
        slots.push({
          startAtISO: slotStart.toISOString(),
          endAtISO: slotEnd.toISOString(),
        });
      }
    }

    availability.push({
      date: format(currentDay, 'yyyy-MM-dd'),
      slots,
    });
  }

  return availability;
}
