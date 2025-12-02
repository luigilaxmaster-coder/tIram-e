import { BaseCrudService } from '@/integrations';
import { Appointments } from '@/entities';
import { parseISO, addHours, isBefore, isAfter } from 'date-fns';
import { sendReminderEmail } from './appointments';

/**
 * This job should be scheduled to run every 10 minutes using Wix Cron
 * It sends reminder emails for upcoming appointments
 */
export async function processAppointmentReminders() {
  const now = new Date();
  const window24hStart = addHours(now, 23.5); // 23.5 hours from now
  const window24hEnd = addHours(now, 24.5); // 24.5 hours from now
  const window2hStart = addHours(now, 1.5); // 1.5 hours from now
  const window2hEnd = addHours(now, 2.5); // 2.5 hours from now

  try {
    const { items: appointments } = await BaseCrudService.getAll<Appointments>('appointments');

    // Process 24-hour reminders
    const appointments24h = appointments.filter((a) => {
      if (a.status !== 'CONFIRMED' || a.reminder24hSent || !a.startAt) return false;
      const startAt = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
      return isAfter(startAt, window24hStart) && isBefore(startAt, window24hEnd);
    });

    for (const appointment of appointments24h) {
      try {
        await sendReminderEmail(appointment._id, '24h');
        console.log(`Sent 24h reminder for appointment ${appointment._id}`);
      } catch (error) {
        console.error(`Failed to send 24h reminder for appointment ${appointment._id}:`, error);
      }
    }

    // Process 2-hour reminders
    const appointments2h = appointments.filter((a) => {
      if (a.status !== 'CONFIRMED' || a.reminder2hSent || !a.startAt) return false;
      const startAt = typeof a.startAt === 'string' ? parseISO(a.startAt) : a.startAt;
      return isAfter(startAt, window2hStart) && isBefore(startAt, window2hEnd);
    });

    for (const appointment of appointments2h) {
      try {
        await sendReminderEmail(appointment._id, '2h');
        console.log(`Sent 2h reminder for appointment ${appointment._id}`);
      } catch (error) {
        console.error(`Failed to send 2h reminder for appointment ${appointment._id}:`, error);
      }
    }

    console.log(`Processed ${appointments24h.length} 24h reminders and ${appointments2h.length} 2h reminders`);
  } catch (error) {
    console.error('Error processing appointment reminders:', error);
    throw error;
  }
}

/**
 * Cleanup old slot locks (older than 1 hour)
 * This prevents the database from growing indefinitely
 */
export async function cleanupOldSlotLocks() {
  const oneHourAgo = addHours(new Date(), -1);

  try {
    const { items: locks } = await BaseCrudService.getAll('slotlocks');
    const oldLocks = locks.filter((l) => {
      if (!l.createdAt) return false;
      const createdAt = typeof l.createdAt === 'string' ? parseISO(l.createdAt) : l.createdAt;
      return isBefore(createdAt, oneHourAgo);
    });

    for (const lock of oldLocks) {
      await BaseCrudService.delete('slotlocks', lock._id);
    }

    console.log(`Cleaned up ${oldLocks.length} old slot locks`);
  } catch (error) {
    console.error('Error cleaning up slot locks:', error);
  }
}
