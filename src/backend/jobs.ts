import { BaseCrudService } from '@/integrations';
import { Appointments, Providers, Services } from '@/entities';
import { sendReminderEmail } from './notifications';
import { differenceInMinutes, parseISO } from 'date-fns';

/**
 * Job to send 24-hour reminder emails
 * This should be called periodically (e.g., every hour)
 */
export async function sendReminder24hEmails(): Promise<void> {
  try {
    const { items: appointments } = await BaseCrudService.getAll<Appointments>('appointments');
    const now = new Date();

    for (const appointment of appointments) {
      // Skip if reminder already sent
      if (appointment.reminder24hSent) {
        continue;
      }

      const appointmentTime = parseISO(appointment.startAt as string);
      const minutesUntilAppointment = differenceInMinutes(appointmentTime, now);

      // Send reminder if appointment is within 24 hours and 23.5 hours away
      if (minutesUntilAppointment <= 1440 && minutesUntilAppointment > 1410) {
        try {
          const provider = await BaseCrudService.getById<Providers>('providers', appointment.providerId!);
          const service = await BaseCrudService.getById<Services>('services', appointment.serviceId!);

          if (provider && service) {
            await sendReminderEmail(appointment, provider, service, '24h');

            // Update appointment to mark reminder as sent
            await BaseCrudService.update<Appointments>('appointments', {
              _id: appointment._id,
              reminder24hSent: true,
            });
          }
        } catch (error) {
          console.error(`Error sending 24h reminder for appointment ${appointment._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in sendReminder24hEmails job:', error);
  }
}

/**
 * Job to send 2-hour reminder emails
 * This should be called periodically (e.g., every hour)
 */
export async function sendReminder2hEmails(): Promise<void> {
  try {
    const { items: appointments } = await BaseCrudService.getAll<Appointments>('appointments');
    const now = new Date();

    for (const appointment of appointments) {
      // Skip if reminder already sent
      if (appointment.reminder2hSent) {
        continue;
      }

      const appointmentTime = parseISO(appointment.startAt as string);
      const minutesUntilAppointment = differenceInMinutes(appointmentTime, now);

      // Send reminder if appointment is within 2 hours and 1.5 hours away
      if (minutesUntilAppointment <= 120 && minutesUntilAppointment > 90) {
        try {
          const provider = await BaseCrudService.getById<Providers>('providers', appointment.providerId!);
          const service = await BaseCrudService.getById<Services>('services', appointment.serviceId!);

          if (provider && service) {
            await sendReminderEmail(appointment, provider, service, '2h');

            // Update appointment to mark reminder as sent
            await BaseCrudService.update<Appointments>('appointments', {
              _id: appointment._id,
              reminder2hSent: true,
            });
          }
        } catch (error) {
          console.error(`Error sending 2h reminder for appointment ${appointment._id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in sendReminder2hEmails job:', error);
  }
}
