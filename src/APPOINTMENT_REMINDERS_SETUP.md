# 📧 Appointment Reminders - Complete Setup Guide

This guide explains how to implement the appointment reminder resend functionality using Wix Triggered Emails.

## 🎯 Overview

The system allows administrators to manually resend appointment reminders to clients from the Provider Dashboard. When the admin clicks the "Resend" button, an email is sent to the client with their appointment details.

## 📋 Features

- ✅ Manual resend of appointment reminders from dashboard
- ✅ Uses Wix Triggered Emails for reliable delivery
- ✅ Tracks resend count and last sent date
- ✅ Automatic contact creation if needed
- ✅ Dynamic email content with appointment details
- ✅ Loading states and error handling

## 🏗️ Architecture

### Backend
- **File**: `/src/backend/appointmentReminders.jsw`
- **Function**: `resendAppointmentReminder(appointmentId)`
- **Technology**: Wix Web Methods + Wix CRM Backend

### Frontend
- **File**: `/src/components/pages/ProviderDashboard.tsx`
- **Button**: "Resend" button in appointments list
- **States**: Loading, success, error handling

### API Endpoint
- **File**: `/src/pages/api/notifications/resend-reminder.ts`
- **Method**: POST
- **Body**: `{ appointmentId, providerId, serviceId }`

## 📝 Step 1: Create Triggered Email Template in Wix

### 1.1 Access Triggered Emails

1. Go to your Wix Dashboard
2. Navigate to **Marketing Tools** → **Triggered Emails**
3. Click **"+ New Triggered Email"**

### 1.2 Design Your Email Template

Create an email template with the following structure:

**Subject Line:**
```
⏰ Appointment Reminder: {{serviceName}}
```

**Email Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: 'Nunito Sans', Arial, sans-serif; 
      color: #333; 
      line-height: 1.6; 
      margin: 0;
      padding: 0;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
    }
    .header { 
      background: linear-gradient(135deg, #00FFD4 0%, #00B8A0 100%); 
      color: #222222; 
      padding: 40px 30px; 
      text-align: center; 
      border-radius: 12px 12px 0 0; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 32px; 
      font-weight: bold; 
    }
    .content { 
      background: #f9f9f9; 
      padding: 40px 30px; 
      border-radius: 0 0 12px 12px; 
    }
    .greeting {
      font-size: 18px;
      color: #222;
      margin-bottom: 20px;
    }
    .detail { 
      margin: 15px 0; 
      padding: 20px; 
      background: white; 
      border-left: 5px solid #00FFD4; 
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .detail-label { 
      font-weight: bold; 
      color: #222222; 
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .detail-value { 
      color: #666; 
      margin-top: 8px; 
      font-size: 16px;
    }
    .cta-section {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: white;
      border-radius: 8px;
    }
    .footer { 
      text-align: center; 
      color: #999; 
      font-size: 12px; 
      margin-top: 30px; 
      padding-top: 20px; 
      border-top: 1px solid #ddd; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Appointment Reminder</h1>
    </div>
    <div class="content">
      <div class="greeting">
        Hi {{customerName}},
      </div>
      
      <p style="font-size: 16px; color: #555;">
        This is a friendly reminder about your upcoming appointment!
      </p>
      
      <div class="detail">
        <div class="detail-label">📋 Service</div>
        <div class="detail-value">{{serviceName}}</div>
      </div>
      
      <div class="detail">
        <div class="detail-label">👤 Provider</div>
        <div class="detail-value">{{providerName}}</div>
      </div>
      
      <div class="detail">
        <div class="detail-label">📅 Date</div>
        <div class="detail-value">{{date}}</div>
      </div>
      
      <div class="detail">
        <div class="detail-label">🕐 Time</div>
        <div class="detail-value">{{time}}</div>
      </div>
      
      <div class="cta-section">
        <p style="margin: 0 0 15px 0; color: #666;">
          Need to reschedule or have questions?
        </p>
        {{#if providerEmail}}
        <p style="margin: 5px 0;">
          <strong>Email:</strong> <a href="mailto:{{providerEmail}}" style="color: #00FFD4;">{{providerEmail}}</a>
        </p>
        {{/if}}
        {{#if providerWhatsApp}}
        <p style="margin: 5px 0;">
          <strong>WhatsApp:</strong> {{providerWhatsApp}}
        </p>
        {{/if}}
      </div>
      
      <p style="text-align: center; color: #888; font-size: 14px; margin-top: 30px;">
        We look forward to seeing you! 🎉
      </p>
    </div>
    <div class="footer">
      <p>This is an automated reminder email.</p>
      <p>&copy; 2025 Appointment Booking System. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
```

### 1.3 Configure Template Variables

Add these variables to your template (Wix will prompt you to define them):

| Variable Name | Type | Description |
|--------------|------|-------------|
| `customerName` | Text | Client's full name |
| `serviceName` | Text | Name of the booked service |
| `date` | Text | Formatted appointment date |
| `time` | Text | Formatted appointment time |
| `providerName` | Text | Provider's business name |
| `providerEmail` | Text | Provider's contact email (optional) |
| `providerWhatsApp` | Text | Provider's WhatsApp number (optional) |
| `appointmentId` | Text | Appointment ID for tracking |

### 1.4 Get Your Template ID

1. After saving your template, go back to **Triggered Emails** list
2. Click on your template
3. Look at the URL - it will contain your Template ID
4. Example: `https://manage.wix.com/dashboard/.../triggered-emails/TEMPLATE_ID_HERE`
5. Copy this Template ID

## 🔧 Step 2: Configure Backend

### 2.1 Update Template ID

Open `/src/backend/appointmentReminders.jsw` and update line 23:

```javascript
// Replace 'YOUR_TEMPLATE_ID_HERE' with your actual Template ID
const TRIGGERED_EMAIL_TEMPLATE_ID = 'your-actual-template-id';
```

### 2.2 Verify Backend Function

The backend function is already implemented and includes:
- ✅ Appointment lookup
- ✅ Provider and service details retrieval
- ✅ Contact creation/lookup
- ✅ Email sending via Triggered Emails
- ✅ Resend tracking (count and timestamp)

## 📊 Step 3: Update Database Schema (Recommended)

To track resend history, add these fields to your `appointments` collection:

| Field Name | Type | Description |
|-----------|------|-------------|
| `contactId` | Text | Wix Contact ID for the client |
| `lastReminderSentAt` | DateTime | Timestamp of last reminder sent |
| `resendCount` | Number | Number of times reminder was resent |
| `lastResendBy` | Text | User who triggered the resend |

**How to add fields:**
1. Go to Wix Dashboard → **CMS** → **Appointments Collection**
2. Click **"+ Add Field"** for each field above
3. Set the field type and name exactly as shown
4. Save changes

> **Note:** The system will work without these fields, but tracking won't be saved.

## 🎨 Step 4: Frontend Integration (Already Done)

The frontend is already integrated in `/src/components/pages/ProviderDashboard.tsx`:

### Features:
- ✅ "Resend" button in appointments list (line 1100-1108)
- ✅ Loading state while sending ("Sending...")
- ✅ Success toast notification
- ✅ Error handling with user-friendly messages
- ✅ Disabled state during sending

### Button Location:
The "Resend" button appears in the **Appointments** tab, next to each appointment in the list.

## 🧪 Step 5: Testing

### 5.1 Test the Resend Function

1. **Login** to your Provider Dashboard
2. Navigate to the **Appointments** tab
3. Find any appointment in the list
4. Click the **"Resend"** button
5. Verify:
   - Button shows "Sending..." state
   - Success toast appears
   - Email is received by the client
   - Button returns to "Resend" state

### 5.2 Check Email Delivery

1. Check the client's email inbox
2. Verify the email contains:
   - ✅ Correct customer name
   - ✅ Correct service name
   - ✅ Correct date and time
   - ✅ Provider contact information

### 5.3 Verify Tracking (if database fields added)

1. Open Wix Dashboard → **CMS** → **Appointments**
2. Find the appointment you resent
3. Check that these fields are updated:
   - `lastReminderSentAt` - should show current timestamp
   - `resendCount` - should increment by 1
   - `contactId` - should contain the Wix contact ID

## 🔍 Troubleshooting

### Issue: "Template not found" error

**Solution:**
- Verify your Template ID is correct
- Make sure the template is published (not draft)
- Check that the template is in the same Wix site

### Issue: Email not received

**Solution:**
- Check spam/junk folder
- Verify client email is correct in appointment
- Check Wix Dashboard → **Marketing Tools** → **Email Logs**
- Ensure template variables are correctly mapped

### Issue: "Contact not found" error

**Solution:**
- The system will automatically create a contact if not found
- Verify client email is valid
- Check Wix Dashboard → **Contacts** to see if contact was created

### Issue: Button stays in "Sending..." state

**Solution:**
- Check browser console for errors
- Verify API endpoint is accessible
- Check backend logs in Wix Dashboard

## 📈 Future Enhancements

Consider adding these features:

1. **WhatsApp Integration**
   - Send reminders via WhatsApp
   - Use Wix WhatsApp Business API

2. **Scheduled Reminders**
   - Automatic reminders 24h before appointment
   - Automatic reminders 2h before appointment
   - Use Wix Scheduled Jobs

3. **SMS Notifications**
   - Send SMS reminders
   - Use Twilio or similar service

4. **Reminder History**
   - Show resend history in dashboard
   - Display who sent and when

5. **Bulk Resend**
   - Resend reminders to multiple appointments
   - Filter by date range or status

## 📚 Additional Resources

- [Wix Triggered Emails Documentation](https://dev.wix.com/docs/develop-websites/articles/wix-crm/triggered-emails)
- [Wix CRM Backend API](https://dev.wix.com/docs/develop-websites/articles/wix-crm/wix-crm-backend)
- [Wix Contacts API](https://dev.wix.com/docs/develop-websites/articles/wix-crm/contacts)

## 💡 Best Practices

1. **Always use contactId**: Store the contactId when creating appointments to avoid duplicate contacts
2. **Rate limiting**: Consider adding rate limiting to prevent spam
3. **Error logging**: Log all errors for debugging
4. **User feedback**: Always show clear success/error messages
5. **Testing**: Test with real email addresses before going live

## 🎉 You're Done!

Your appointment reminder system is now fully functional. Administrators can resend reminders to clients with a single click from the dashboard.

---

**Need Help?**
- Check the browser console for errors
- Review Wix Dashboard logs
- Verify all configuration steps above
