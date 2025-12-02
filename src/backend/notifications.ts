import { Appointments, Providers, Services } from '@/entities';
import { BaseCrudService } from '@/integrations';
import { format, parseISO } from 'date-fns';

/**
 * Send confirmation email and WhatsApp message to client
 */
export async function sendConfirmationNotifications(
  appointment: Appointments,
  provider: Providers,
  service: Services
): Promise<void> {
  try {
    // Send email
    await sendConfirmationEmail(appointment, provider, service);
    
    // Send WhatsApp message if provider has WhatsApp number
    if (provider.whatsappNumber) {
      await sendWhatsAppMessage(appointment, provider, service);
    }
  } catch (error) {
    console.error('Error sending confirmation notifications:', error);
    // Don't throw - we don't want to fail the appointment creation if notifications fail
  }
}

/**
 * Send confirmation email to client
 */
async function sendConfirmationEmail(
  appointment: Appointments,
  provider: Providers,
  service: Services
): Promise<void> {
  try {
    const startTime = format(parseISO(appointment.startAt as string), 'EEEE, MMMM d, yyyy h:mm a');
    const endTime = format(parseISO(appointment.endAt as string), 'h:mm a');

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Nunito Sans', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00FFD4 0%, #00FFD4 100%); color: #222222; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 25px; }
    .section h2 { color: #00FFD4; font-size: 18px; margin-bottom: 10px; }
    .detail { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #00FFD4; }
    .detail-label { font-weight: bold; color: #222222; }
    .detail-value { color: #666; margin-top: 5px; }
    .cta-button { display: inline-block; background: #00FFD4; color: #222222; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Booking Confirmed!</h1>
    </div>
    <div class="content">
      <div class="section">
        <h2>Service Details</h2>
        <div class="detail">
          <div class="detail-label">Service:</div>
          <div class="detail-value">${service.name}</div>
        </div>
        <div class="detail">
          <div class="detail-label">Provider:</div>
          <div class="detail-value">${provider.displayName}</div>
        </div>
        <div class="detail">
          <div class="detail-label">Date & Time:</div>
          <div class="detail-value">${startTime} - ${endTime}</div>
        </div>
        <div class="detail">
          <div class="detail-label">Duration:</div>
          <div class="detail-value">${service.durationMin} minutes</div>
        </div>
        <div class="detail">
          <div class="detail-label">Price:</div>
          <div class="detail-value">$${service.price}</div>
        </div>
        ${appointment.peopleCount ? `
        <div class="detail">
          <div class="detail-label">Number of People:</div>
          <div class="detail-value">${appointment.peopleCount}</div>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <h2>Your Information</h2>
        <div class="detail">
          <div class="detail-label">Name:</div>
          <div class="detail-value">${appointment.clientName}</div>
        </div>
        <div class="detail">
          <div class="detail-label">Email:</div>
          <div class="detail-value">${appointment.clientEmail}</div>
        </div>
        <div class="detail">
          <div class="detail-label">Phone:</div>
          <div class="detail-value">${appointment.clientPhone}</div>
        </div>
      </div>

      ${appointment.notes ? `
      <div class="section">
        <h2>Your Notes</h2>
        <div class="detail">
          <div class="detail-value">${appointment.notes}</div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2>What's Next?</h2>
        <p>We'll send you a reminder 24 hours before your appointment. If you need to reschedule or cancel, please contact the provider directly.</p>
        ${provider.contactEmail ? `<p><strong>Provider Email:</strong> ${provider.contactEmail}</p>` : ''}
        ${provider.whatsappNumber ? `<p><strong>Provider WhatsApp:</strong> ${provider.whatsappNumber}</p>` : ''}
      </div>

      <p style="text-align: center; margin-top: 30px;">
        <a href="https://yoursite.com" class="cta-button">View Your Booking</a>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated confirmation email. Please do not reply to this message.</p>
      <p>&copy; 2025 Appointment Booking System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using Wix Email API
    const response = await fetch('https://www.wixapis.com/v1/contacts/email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WIX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: appointment.clientEmail,
        subject: `Booking Confirmed: ${service.name} with ${provider.displayName}`,
        html: emailBody,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send confirmation email:', await response.text());
    } else {
      console.log('Confirmation email sent to:', appointment.clientEmail);
    }
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

/**
 * Send WhatsApp message to client
 */
async function sendWhatsAppMessage(
  appointment: Appointments,
  provider: Providers,
  service: Services
): Promise<void> {
  try {
    const startTime = format(parseISO(appointment.startAt as string), 'EEEE, MMMM d, yyyy h:mm a');

    const message = `
Hello ${appointment.clientName}! 👋

Your booking is confirmed! ✓

📋 Service: ${service.name}
👤 Provider: ${provider.displayName}
📅 Date & Time: ${startTime}
⏱️ Duration: ${service.durationMin} minutes
💰 Price: $${service.price}

We'll send you a reminder 24 hours before your appointment.

If you need to reschedule or have any questions, please contact us.

Thank you for booking with us! 🎉
    `.trim();

    // Send WhatsApp message using Wix WhatsApp API
    const response = await fetch('https://www.wixapis.com/v1/contacts/whatsapp/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WIX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: provider.whatsappNumber,
        message: message,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send WhatsApp message:', await response.text());
    } else {
      console.log('WhatsApp message sent to:', provider.whatsappNumber);
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

/**
 * Send reminder email to client
 */
export async function sendReminderEmail(
  appointment: Appointments,
  provider: Providers,
  service: Services,
  reminderType: '24h' | '2h'
): Promise<void> {
  try {
    const startTime = format(parseISO(appointment.startAt as string), 'EEEE, MMMM d, yyyy h:mm a');
    const reminderText = reminderType === '24h' ? 'tomorrow' : 'in 2 hours';

    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Nunito Sans', sans-serif; color: #333; line-height: 1.6; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #00FFD4 0%, #00FFD4 100%); color: #222222; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .detail { margin: 15px 0; padding: 15px; background: white; border-left: 4px solid #00FFD4; }
    .detail-label { font-weight: bold; color: #222222; }
    .detail-value { color: #666; margin-top: 5px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Appointment Reminder</h1>
    </div>
    <div class="content">
      <p>Hi ${appointment.clientName},</p>
      <p>This is a friendly reminder that your appointment is ${reminderText}!</p>
      
      <div class="detail">
        <div class="detail-label">Service:</div>
        <div class="detail-value">${service.name}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Provider:</div>
        <div class="detail-value">${provider.displayName}</div>
      </div>
      <div class="detail">
        <div class="detail-label">Date & Time:</div>
        <div class="detail-value">${startTime}</div>
      </div>
      
      <p style="margin-top: 25px;">
        If you need to reschedule or cancel, please contact the provider as soon as possible.
      </p>
      
      ${provider.contactEmail ? `<p><strong>Provider Email:</strong> ${provider.contactEmail}</p>` : ''}
      ${provider.whatsappNumber ? `<p><strong>Provider WhatsApp:</strong> ${provider.whatsappNumber}</p>` : ''}
    </div>
    <div class="footer">
      <p>This is an automated reminder email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
    `;

    const response = await fetch('https://www.wixapis.com/v1/contacts/email/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WIX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: appointment.clientEmail,
        subject: `Reminder: ${service.name} ${reminderType === '24h' ? 'tomorrow' : 'in 2 hours'}`,
        html: emailBody,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to send ${reminderType} reminder email:`, await response.text());
    } else {
      console.log(`${reminderType} reminder email sent to:`, appointment.clientEmail);
    }
  } catch (error) {
    console.error(`Error sending ${reminderType} reminder email:`, error);
  }
}
