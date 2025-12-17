# 📧 Email Notifications - Complete Setup Guide

## Overview

The Email Notifications feature allows you to automatically send emails to clients when they:
- ✅ Book an appointment (confirmation email)
- ✅ Have an appointment coming up (24-hour reminder)
- ✅ Have an appointment very soon (2-hour reminder)

## Current Status

✅ **Frontend**: Email notification settings UI fully implemented
✅ **Backend**: Email sending functions ready (`sendConfirmationEmail`, `sendReminderEmail`)
✅ **Database**: Provider model updated to store notification settings

⚠️ **Missing**: Wix API Key configuration for email sending

---

## 🚀 Setup Instructions

### Step 1: Get Your Wix API Key

1. Go to your **Wix Dashboard**
2. Navigate to **Settings** → **API & Extensions**
3. Click **Create API Key**
4. Select permissions:
   - ✅ Contacts (Email)
   - ✅ Contacts (WhatsApp) - Optional, for WhatsApp messages
5. Copy the API Key

### Step 2: Configure Environment Variables

Add this to your Wix project environment variables:

```
WIX_API_KEY=your_api_key_here
```

**Important:**
- Never expose this key in frontend code
- Only use it on the server-side (in `/src/backend/` files)
- Never commit it to version control

### Step 3: Enable Email Notifications in Dashboard

1. Go to **Provider Dashboard** → **Integrations** tab
2. Find **Email Notifications** card
3. Click **Enable Notifications**
4. Configure which emails to send:
   - ✅ Booking Confirmation Email
   - ✅ 24-Hour Reminder Email
   - ✅ 2-Hour Reminder Email
5. Click **Save Settings**

---

## 📊 How It Works

### 1. Booking Confirmation Email (Immediate)

When a client books an appointment:

```
User books appointment
    ↓
createAppointment() is called
    ↓
sendConfirmationNotifications() is triggered
    ↓
Email sent to client with:
  - Service details
  - Date & time
  - Provider info
  - Client information
  - Contact details
```

**Email Content:**
- Service name
- Provider name
- Appointment date & time
- Duration
- Price
- Number of people
- Client notes (if any)
- Provider contact info

### 2. Reminder Emails (Scheduled)

Reminders are sent automatically at scheduled times:

```
24 hours before appointment:
  - Email sent to client
  - Appointment marked as "reminder24hSent"

2 hours before appointment:
  - Email sent to client
  - Appointment marked as "reminder2hSent"
```

**Email Content:**
- Friendly reminder message
- Service name
- Provider name
- Appointment date & time
- Provider contact info

---

## 🔧 Configuration

### Email Notification Settings

In the **Provider Dashboard** → **Integrations** tab:

1. **Enable/Disable**: Toggle email notifications on/off
2. **Booking Confirmation**: Send email when client books
3. **24-Hour Reminder**: Send email 24 hours before
4. **2-Hour Reminder**: Send email 2 hours before

Settings are saved to the provider's profile and persist across sessions.

---

## 📁 Files Modified

### `/src/components/pages/ProviderDashboard.tsx`
- Added email notification state management
- Added email settings modal dialog
- Updated integrations tab to show email notifications
- Added handlers for saving email settings

### `/src/backend/notifications.ts`
- `sendConfirmationEmail()` - Sends booking confirmation
- `sendReminderEmail()` - Sends reminder emails (24h or 2h)
- `sendConfirmationNotifications()- Sends both email and WhatsApp

### `/src/backend/appointments.ts`
- Calls `sendConfirmationNotifications()` after creating appointment
- Automatically sends emails when appointments are created

### `/src/entities/index.ts`
- Added `emailNotificationsEnabled` field to Providers
- Added `emailNotificationSettings` field to Providers

---

## 🧪 Testing Email Notifications

### Test 1: Booking Confirmation Email

1. Go to a provider's public page
2. Fill out the booking form
3. Submit the form
4. Check your email for confirmation

**Expected:**
- Email arrives within 1-2 minutes
- Contains all appointment details
- Shows provider contact information

### Test 2: Enable/Disable Settings

1. Go to **Provider Dashboard** → **Integrations**
2. Click **Enable Notifications** on Email Notifications card
3. Configure which emails to send
4. Click **Save Settings**
5. Create a new appointment
6. Verify email is sent

### Test 3: Verify Settings Persist

1. Enable email notifications
2. Save settings
3. Refresh the page
4. Go back to Integrations tab
5. Verify settings are still enabled

---

## 🐛 Troubleshooting

### Emails Not Sending

**Problem**: Emails are not being sent to clients

**Solutions:**
1. Verify `WIX_API_KEY` is set in environment variables
2. Check that email notifications are enabled in settings
3. Verify client email address is valid
4. Check server logs for error messages
5. Ensure Wix API key has "Contacts (Email)" permission

### Emails Going to Spam

**Problem**: Emails are arriving in spam folder

**Solutions:**
1. Verify sender email is configured in Wix
2. Add SPF and DKIM records to your domain
3. Use a professional email address as sender
4. Avoid spam trigger words in email content

### Reminders Not Sending

**Problem**: Reminder emails are not being sent

**Solutions:**
1. Verify cron job is running (if using scheduled reminders)
2. Check that appointments have `reminder24hSent` and `reminder2hSent` set to false
3. Verify appointment times are in the future
4. Check server logs for errors

---

## 📧 Email Templates

### Booking Confirmation Email

```
Subject: Booking Confirmed: [Service Name] with [Provider Name]

✓ Booking Confirmed!

Service Details:
- Service: [Service Name]
- Provider: [Provider Name]
- Date & Time: [Date] [Time] - [End Time]
- Duration: [Duration] minutes
- Price: $[Price]
- Number of People: [Count]

Your Information:
- Name: [Client Name]
- Email: [Client Email]
- Phone: [Client Phone]

Your Notes:
[Client Notes]

What's Next?
We'll send you a reminder 24 hours before your appointment.
If you need to reschedule or cancel, please contact the provider directly.

Provider Email: [Provider Email]
Provider WhatsApp: [WhatsApp Number]
```

### 24-Hour Reminder Email

```
Subject: Reminder: [Service Name] tomorrow

⏰ Appointment Reminder

Hi [Client Name],

This is a friendly reminder that your appointment is tomorrow!

Service: [Service Name]
Provider: [Provider Name]
Date & Time: [Date] [Time]

If you need to reschedule or cancel, please contact the provider as soon as possible.

Provider Email: [Provider Email]
Provider WhatsApp: [WhatsApp Number]
```

### 2-Hour Reminder Email

```
Subject: Reminder: [Service Name] in 2 hours

⏰ Appointment Reminder

Hi [Client Name],

This is a friendly reminder that your appointment is in 2 hours!

Service: [Service Name]
Provider: [Provider Name]
Date & Time: [Date] [Time]

If you need to reschedule or cancel, please contact the provider as soon as possible.

Provider Email: [Provider Email]
Provider WhatsApp: [WhatsApp Number]
```

---

## 🔐 Security Notes

1. **API Key**: Never expose `WIX_API_KEY` in frontend code
2. **Email Validation**: All emails are validated before sending
3. **Rate Limiting**: Wix API has rate limits - be aware of high-volume bookings
4. **Data Privacy**: Client emails are only used for notifications
5. **Opt-Out**: Clients can request to opt-out of emails (future feature)

---

## 📊 Database Schema

### Providers Collection

```typescript
interface Providers {
  // ... existing fields ...
  
  // Email Notifications
  emailNotificationsEnabled?: boolean;
  emailNotificationSettings?: string; // JSON string:
  // {
  //   sendConfirmation: boolean;
  //   sendReminder24h: boolean;
  //   sendReminder2h: boolean;
  //   customMessage?: string;
  // }
}
```

### Appointments Collection

```typescript
interface Appointments {
  // ... existing fields ...
  
  // Reminder tracking
  reminder24hSent?: boolean;
  reminder2hSent?: boolean;
}
```

---

## 🎯 Next Steps

1. ✅ Set up Wix API Key
2. ✅ Configure environment variables
3. ✅ Enable email notifications in dashboard
4. ✅ Test with a booking
5. ✅ Verify emails are being sent
6. ✅ Configure reminder emails
7. ✅ Monitor email delivery

---

## 📚 Useful Resources

- [Wix API Documentation](https://www.wix.com/velo/reference/wix-api)
- [Wix Contacts API](https://www.wix.com/velo/reference/wix-crm/contacts)
- [Email Best Practices](https://www.wix.com/velo/reference/wix-crm/contacts/send-email)
- [Wix Scheduler](https://www.wix.com/velo/reference/wix-scheduler)

---

## 💬 Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review server logs for error messages
3. Verify all environment variables are set
4. Test with a simple booking first
5. Check Wix API documentation for rate limits

---

## 🚀 Future Enhancements

Potential features to add:
- Custom email templates
- Email template editor in dashboard
- Unsubscribe links
- Email delivery tracking
- A/B testing for email content
- SMS notifications
- Push notifications
- Email scheduling
- Bulk email sending

