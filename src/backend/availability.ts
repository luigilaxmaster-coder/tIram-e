import { BaseCrudService } from '@/integrations';
import { Providers, Services, Appointments, SlotLocks } from '@/entities';
import { parseISO, addMinutes, format, startOfDay, addDays } from 'date-fns';
const WORK_START_HOUR = 6; // 6 AM
const WORK_END_HOUR = 24; // 12 AM (midnight)
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

  // Generate availability for each day
  const availability: DayAvailability[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const currentDay = addDays(weekStart, dayOffset);
    const dayStart = startOfDay(currentDay);

    const slots: AvailabilitySlot[] = [];

    // Generate slots from 6 AM to 12 AM (midnight)
    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL_MIN) {
        const slotStart = new Date(dayStart);
        slotStart.setHours(hour, minute, 0, 0);

        // Calculate slot end based on service duration + buffers
        const totalDuration =
          (service.durationMin || 30) +
          (service.bufferBeforeMin || 0) +
          (service.bufferAfterMin || 0);
        const slotEnd = addMinutes(slotStart, totalDuration);

        // Check if slot end exceeds work hours
        if (slotEnd.getHours() > WORK_END_HOUR || (slotEnd.getHours() === WORK_END_HOUR && slotEnd.getMinutes() > 0)) {
          continue;
        }

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
    }

    availability.push({
      date: format(currentDay, 'yyyy-MM-dd'),
      slots,
    });
  }

  return availability;
}
