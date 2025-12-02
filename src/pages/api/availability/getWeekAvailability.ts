import type { APIRoute } from 'astro';
import { getWeekAvailability } from '@/backend/availability';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { providerId, serviceId, weekStartISO } = await request.json();

    if (!providerId || !serviceId || !weekStartISO) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const availability = await getWeekAvailability(providerId, serviceId, weekStartISO);

    return new Response(JSON.stringify({ availability }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in getWeekAvailability:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
