import type { APIRoute } from 'astro';
import { BaseCrudService } from '@/integrations';
import { Appointments, Providers, Services } from '@/entities';
import { sendReminderEmail } from '@/backend/notifications';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { appointmentId, providerId, serviceId } = body;

    // Validate required fields
    if (!appointmentId || !providerId || !serviceId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          message: 'appointmentId, providerId, and serviceId are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get appointment
    const appointment = await BaseCrudService.getById<Appointments>('appointments', appointmentId);
    if (!appointment) {
      return new Response(
        JSON.stringify({
          error: 'Appointment not found',
          message: `No appointment found with ID: ${appointmentId}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get provider
    const provider = await BaseCrudService.getById<Providers>('providers', providerId);
    if (!provider) {
      return new Response(
        JSON.stringify({
          error: 'Provider not found',
          message: `No provider found with ID: ${providerId}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get service
    const service = await BaseCrudService.getById<Services>('services', serviceId);
    if (!service) {
      return new Response(
        JSON.stringify({
          error: 'Service not found',
          message: `No service found with ID: ${serviceId}`,
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Send reminder email (using '24h' as default reminder type)
    await sendReminderEmail(appointment, provider, service, '24h');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminder sent successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error resending reminder:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to resend reminder',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
