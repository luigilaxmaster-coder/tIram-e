import { BaseCrudService } from '@/integrations';
import { Appointments, Services, SlotLocks } from '@/entities';
import { parseISO, addMinutes } from 'date-fns';

interface CreateAppointmentPayload {
  providerId: string;
  serviceId: string;
  startAtISO: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  peopleCount: number;
  notes?: string;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<{ appointmentId: string }> {
  const { providerId, serviceId, startAtISO, clientName, clientEmail, clientPhone, peopleCount, notes } = payload;

  // Validate required fields
  if (!clientName || !clientEmail || !clientPhone) {
    throw new Error('Name, email, and phone are required');
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clientEmail)) {
    throw new Error('Invalid email format');
  }

  // Get service details
  const service = await BaseCrudService.getById<Services>('services', serviceId);
  if (!service) {
    throw new Error('Service not found');
  }

  // Validate people count
  if (service.maxPeoplePerBooking && peopleCount > service.maxPeoplePerBooking) {
    throw new Error(`Maximum ${service.maxPeoplePerBooking} people allowed for this service`);
  }

  // Calculate end time
  const startAt = parseISO(startAtISO);
  const totalDuration =
    (service.durationMin || 30) +
    (service.bufferBeforeMin || 0) +
    (service.bufferAfterMin || 0);
  const endAt = addMinutes(startAt, totalDuration);

  // Create lock key
  const lockKey = `${providerId}|${startAtISO}`;

  // Try to create slot lock (this prevents double booking)
  try {
    const slotLock: SlotLocks = {
      _id: crypto.randomUUID(),
      lockKey,
      providerId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    await BaseCrudService.create('slotlocks', slotLock);

    // Create appointment
    const appointment: Appointments = {
      _id: crypto.randomUUID(),
      providerId,
      serviceId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      clientName,
      clientEmail,
      clientPhone,
      peopleCount,
      notes: notes || '',
      status: 'CONFIRMED',
      createdAt: new Date().toISOString(),
      reminder24hSent: false,
      reminder2hSent: false,
    };

    await BaseCrudService.create('appointments', appointment);

    // Update slot lock with appointment ID
    await BaseCrudService.update<SlotLocks>('slotlocks', {
      _id: slotLock._id,
      appointmentId: appointment._id,
    });

    // TODO: Send confirmation email
    // This would be implemented using Wix Triggered Emails
    console.log('Appointment created, confirmation email should be sent to:', clientEmail);

    return { appointmentId: appointment._id };
  } catch (error: any) {
    // If lock creation fails due to duplicate key, slot is already taken
    if (error.message && error.message.includes('duplicate')) {
      throw new Error('SLOT_TAKEN');
    }
    throw error;
  }
}

export async function sendConfirmationEmail(appointmentId: string) {
  // This would integrate with Wix Triggered Emails
  // For now, we'll just log it
  const appointment = await BaseCrudService.getById<Appointments>('appointments', appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  console.log('Sending confirmation email to:', appointment.clientEmail);
  // Implementation would use Wix Triggered Emails API
}

export async function sendReminderEmail(appointmentId: string, reminderType: '24h' | '2h') {
  // This would integrate with Wix Triggered Emails
  const appointment = await BaseCrudService.getById<Appointments>('appointments', appointmentId);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  console.log(`Sending ${reminderType} reminder email to:`, appointment.clientEmail);
  // Implementation would use Wix Triggered Emails API

  // Update reminder sent flag
  if (reminderType === '24h') {
    await BaseCrudService.update<Appointments>('appointments', {
      _id: appointmentId,
      reminder24hSent: true,
    });
  } else {
    await BaseCrudService.update<Appointments>('appointments', {
      _id: appointmentId,
      reminder2hSent: true,
    });
  }
}
