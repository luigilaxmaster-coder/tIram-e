import type { APIRoute } from 'astro';
import { createAppointment } from '@/backend/appointments';

export const POST: APIRoute = async ({ request }) => {
  try {
    const payload = await request.json();

    const result = await createAppointment(payload);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in createAppointment:', error);

    // Check if it's a slot taken error
    if (error.message === 'SLOT_TAKEN') {
      return new Response(JSON.stringify({ error: 'SLOT_TAKEN' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
