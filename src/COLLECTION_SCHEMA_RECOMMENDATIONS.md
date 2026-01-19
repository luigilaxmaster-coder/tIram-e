# 📊 Collection Schema Recommendations

## Appointments Collection - Recommended Fields

To fully support the appointment reminder resend functionality, add the following fields to your `appointments` collection in the Wix CMS:

### Required Fields (Already Exist)
These fields should already exist in your collection:

| Field Name | Type | Description | Required |
|-----------|------|-------------|----------|
| `_id` | Text | Unique appointment ID | ✅ Yes |
| `providerId` | Text | Provider's ID | ✅ Yes |
| `serviceId` | Text | Service ID | ✅ Yes |
| `startAt` | DateTime | Appointment start time | ✅ Yes |
| `endAt` | DateTime | Appointment end time | ✅ Yes |
| `clientName` | Text | Client's full name | ✅ Yes |
| `clientEmail` | Text | Client's email address | ✅ Yes |
| `clientPhone` | Text | Client's phone number | ✅ Yes |
| `status` | Text | Appointment status (CONFIRMED, CANCELLED, etc.) | ✅ Yes |
| `reminder24hSent` | Boolean | Whether 24h reminder was sent | ✅ Yes |
| `reminder2hSent` | Boolean | Whether 2h reminder was sent | ✅ Yes |

### New Fields to Add (For Resend Tracking)

Add these fields to track reminder resends and contact information:

| Field Name | Type | Description | Default Value |
|-----------|------|-------------|---------------|
| `contactId` | Text | Wix Contact ID for the client | `null` |
| `lastReminderSentAt` | DateTime | Timestamp of last reminder sent | `null` |
| `resendCount` | Number | Number of times reminder was manually resent | `0` |
| `lastResendBy` | Text | User ID or email of admin who triggered resend | `null` |

## How to Add Fields in Wix Dashboard

### Step 1: Access CMS Collections

1. Go to your **Wix Dashboard**
2. Navigate to **CMS** (Content Management System)
3. Find and click on **"Appointments"** collection

### Step 2: Add Each Field

For each field listed above, follow these steps:

#### Adding `contactId` Field

1. Click **"+ Add Field"** button
2. Configure the field:
   - **Field Name**: `contactId`
   - **Field Type**: **Text**
   - **Display Name**: `Contact ID`
   - **Description**: `Wix Contact ID for the client`
3. Click **"Save"**

#### Adding `lastReminderSentAt` Field

1. Click **"+ Add Field"** button
2. Configure the field:
   - **Field Name**: `lastReminderSentAt`
   - **Field Type**: **DateTime**
   - **Display Name**: `Last Reminder Sent At`
   - **Description**: `Timestamp of last reminder sent`
3. Click **"Save"**

#### Adding `resendCount` Field

1. Click **"+ Add Field"** button
2. Configure the field:
   - **Field Name**: `resendCount`
   - **Field Type**: **Number**
   - **Display Name**: `Resend Count`
   - **Description**: `Number of times reminder was manually resent`
   - **Default Value**: `0`
3. Click **"Save"**

#### Adding `lastResendBy` Field

1. Click **"+ Add Field"** button
2. Configure the field:
   - **Field Name**: `lastResendBy`
   - **Field Type**: **Text**
   - **Display Name**: `Last Resend By`
   - **Description**: `User ID or email of admin who triggered resend`
3. Click **"Save"**

### Step 3: Verify Fields

After adding all fields:

1. Go to **CMS** → **Appointments** collection
2. Click on any appointment to view its details
3. Verify that all new fields appear in the form
4. The fields should be empty/null for existing appointments

## Field Usage in the System

### `contactId`
- **Purpose**: Links the appointment to a Wix Contact
- **Set When**: 
  - During appointment creation (if contact exists)
  - During first reminder resend (if not set)
- **Used For**: 
  - Sending Triggered Emails via Wix CRM
  - Avoiding duplicate contact creation

### `lastReminderSentAt`
- **Purpose**: Tracks when the last reminder was sent
- **Set When**: Every time a reminder is resent
- **Used For**: 
  - Displaying last sent time in dashboard
  - Preventing spam (optional rate limiting)
  - Analytics and reporting

### `resendCount`
- **Purpose**: Counts how many times reminder was manually resent
- **Set When**: Incremented each time admin clicks "Resend"
- **Used For**: 
  - Tracking reminder frequency
  - Analytics and reporting
  - Identifying problematic appointments

### `lastResendBy`
- **Purpose**: Tracks which admin user resent the reminder
- **Set When**: Every time a reminder is resent
- **Used For**: 
  - Audit trail
  - Team accountability
  - Analytics and reporting

## Optional: Permissions Configuration

If you want to restrict who can modify these fields:

1. Go to **CMS** → **Appointments** → **Settings**
2. Click on **"Permissions"**
3. Configure field-level permissions:
   - `contactId`: **Admin only** (auto-populated)
   - `lastReminderSentAt`: **Admin only** (auto-populated)
   - `resendCount`: **Admin only** (auto-populated)
   - `lastResendBy`: **Admin only** (auto-populated)

## Data Migration (For Existing Appointments)

If you have existing appointments, you may want to:

1. **Set default values** for new fields:
   ```javascript
   // All existing appointments will have:
   contactId: null
   lastReminderSentAt: null
   resendCount: 0
   lastResendBy: null
   ```

2. **Backfill contactId** for existing appointments:
   - Run a script to match appointments with existing contacts
   - Use client email to find matching contacts
   - Update appointments with found contactId

## Validation Rules (Optional)

Consider adding these validation rules in Wix CMS:

### `contactId`
- **Format**: Must be a valid Wix Contact ID
- **Pattern**: Alphanumeric string

### `resendCount`
- **Minimum**: 0
- **Maximum**: 999 (reasonable limit)

### `lastResendBy`
- **Format**: Email address or user ID

## Database Indexes (For Performance)

For better query performance, consider adding indexes on:

1. **`contactId`**: For quick contact lookups
2. **`lastReminderSentAt`**: For sorting by last sent date
3. **`resendCount`**: For filtering high-resend appointments

To add indexes:
1. Go to **CMS** → **Appointments** → **Settings**
2. Click on **"Indexes"**
3. Add index for each field listed above

## Testing the New Fields

After adding the fields, test the system:

1. **Create a new appointment** via the booking form
2. **Resend a reminder** from the dashboard
3. **Check the CMS** to verify:
   - `contactId` is populated
   - `lastReminderSentAt` shows current timestamp
   - `resendCount` is incremented to 1
   - `lastResendBy` shows admin identifier

## Troubleshooting

### Fields not appearing in CMS
- **Solution**: Refresh the CMS page
- **Solution**: Clear browser cache
- **Solution**: Check field names match exactly (case-sensitive)

### Fields not being updated
- **Solution**: Verify backend code has correct field names
- **Solution**: Check CMS permissions allow updates
- **Solution**: Review browser console for errors

### Data not saving
- **Solution**: Verify field types match (Text, DateTime, Number)
- **Solution**: Check for validation errors in CMS
- **Solution**: Ensure no required fields are missing

## Summary

By adding these four fields to your `appointments` collection, you'll enable:

✅ **Contact Management**: Link appointments to Wix Contacts  
✅ **Resend Tracking**: Track when and how many times reminders were sent  
✅ **Audit Trail**: Know who resent reminders  
✅ **Analytics**: Generate reports on reminder effectiveness  
✅ **Better UX**: Show resend history in dashboard  

These fields are **optional but highly recommended** for a production-ready appointment reminder system.
