# TíramE - Appointment Scheduling Application

## Overview
TíramE is a comprehensive appointment scheduling web application built on the Wix platform. It allows service providers to manage their public profiles, services, and appointments while enabling clients to book appointments through a sleek, neon-themed interface.

## Features Implemented

### 1. Public Provider Pages (`/p/{slug}`)
- **Dynamic routing** based on provider slug
- **Provider information display**: name, address, WhatsApp, email, categories
- **Service catalog** with advanced filtering:
  - Text search (name/category)
  - Category filter
  - Duration filter
  - Price range filter
  - Group size filter
- **Weekly availability calendar**:
  - Shows 7 days of availability
  - 30-minute time slots from 6:00 AM to 12:00 AM
  - Real-time slot availability
  - Week navigation (previous/next)
- **Booking modal** with form validation:
  - Client name (required)
  - Email (required, validated)
  - Phone (required)
  - Number of people (validated against service max)
  - Optional notes
- **Booking confirmation** with success message
- **Anti-double-booking** protection using slot locks

### 2. Provider Dashboard (`/pro/dashboard`)
Protected route requiring authentication. Features include:

#### Today Tab
- List of today's appointments
- Client details (name, email, phone)
- Appointment time and status
- Number of people
- Notes

#### This Week Tab
- Appointments grouped by day
- Week overview with all confirmed appointments

#### Services Tab (CRUD)
- **Create** new services
- **Read** all services in a grid layout
- **Update** existing services
- **Delete** services with confirmation
- Service fields:
  - Name, category
  - Duration (minutes)
  - Price
  - Max people per booking
  - Buffer before/after (minutes)
  - Active/inactive status

#### Profile Tab
- Edit provider information:
  - Display name
  - Unique slug (URL)
  - Categories
  - Address
  - WhatsApp number
  - Contact email
- **Copy profile URL** to clipboard
- View public profile link

#### All Appointments Tab
- Filter by:
  - Today
  - This week
  - Custom date range
- Full appointment details
- Status indicators

### 3. Backend Modules

#### `/src/backend/availability.ts`
- `getProviderBySlug(slug)`: Fetches provider and their active services
- `listActiveServices(providerId, filters)`: Returns filtered services
- `getWeekAvailability(providerId, serviceId, weekStartISO)`: 
  - Generates 30-minute slots from 6 AM to 12 AM
  - Calculates slot end time including service duration + buffers
  - Checks for conflicts with existing appointments and slot locks
  - Returns available slots per day for the week

#### `/src/backend/appointments.ts`
- `createAppointment(payload)`:
  - Validates client information (email format, phone, name)
  - Validates people count against service max
  - Creates unique slot lock to prevent double-booking
  - Creates appointment with CONFIRMED status
  - Links slot lock to appointment
  - Returns appointment ID or SLOT_TAKEN error
- `sendConfirmationEmail(appointmentId)`: Placeholder for email integration
- `sendReminderEmail(appointmentId, reminderType)`: Placeholder for reminder emails

#### `/src/backend/jobs.ts`
- `processAppointmentReminders()`:
  - Runs every 10 minutes (to be scheduled with Wix Cron)
  - Sends 24-hour reminders (23.5-24.5 hour window)
  - Sends 2-hour reminders (1.5-2.5 hour window)
  - Updates reminder flags
- `cleanupOldSlotLocks()`: Removes slot locks older than 1 hour

### 4. API Endpoints

#### POST `/api/availability/getProviderBySlug`
Request: `{ slug: string }`
Response: `{ provider: Providers, services: Services[] }`

#### POST `/api/availability/getWeekAvailability`
Request: `{ providerId: string, serviceId: string, weekStartISO: string }`
Response: `{ availability: DayAvailability[] }`

#### POST `/api/appointments/createAppointment`
Request: `CreateAppointmentPayload`
Response: `{ appointmentId: string }` or `{ error: "SLOT_TAKEN" }`

## Database Collections

### Providers
- `memberId`: Linked to Wix member email
- `slug`: Unique URL identifier
- `displayName`: Business name
- `categoryTags`: Service categories
- `addressText`: Physical address
- `whatsappNumber`: Contact number
- `contactEmail`: Contact email
- `timezone`: Default "America/Santo_Domingo"
- `isActive`: Provider status

### Services
- `_id`: Prefixed with providerId for filtering
- `name`: Service name
- `category`: Service category
- `durationMin`: Service duration
- `price`: Service price (optional)
- `maxPeoplePerBooking`: Maximum group size
- `bufferBeforeMin`: Buffer time before
- `bufferAfterMin`: Buffer time after
- `isActive`: Service status

### Appointments
- `providerId`: Reference to provider
- `serviceId`: Reference to service
- `startAt`: Appointment start time
- `endAt`: Appointment end time
- `clientName`: Client name
- `clientEmail`: Client email
- `clientPhone`: Client phone
- `peopleCount`: Number of people
- `notes`: Optional notes
- `status`: CONFIRMED/CANCELLED/NO_SHOW/COMPLETED
- `reminder24hSent`: 24h reminder flag
- `reminder2hSent`: 2h reminder flag

### SlotLocks (Anti-Double-Booking)
- `lockKey`: Unique key (providerId|startAtISO)
- `providerId`: Reference to provider
- `startAt`: Lock start time
- `endAt`: Lock end time
- `appointmentId`: Reference to appointment (nullable)
- `createdAt`: Lock creation time

## How Anti-Double-Booking Works

1. When a client attempts to book a slot, the system creates a `SlotLock` with a unique `lockKey`
2. The `lockKey` is composed of `providerId|startAtISO`
3. If another client tries to book the same slot simultaneously, the database will reject the duplicate `lockKey`
4. The first successful lock creation proceeds to create the appointment
5. The slot lock is then updated with the appointment ID
6. When calculating availability, both appointments and slot locks are checked for conflicts

## Design System

### Colors
- **Primary (Neon Teal)**: `#00FFD4` - Used for CTAs, highlights, interactive elements
- **Background (Deep Charcoal)**: `#222222` - Main background
- **Foreground**: `#FFFFFF` - Text color
- **Light Gray**: `#EAEAEA` - Secondary text, borders
- **Destructive**: `#FF4136` - Error states

### Typography
- **Headings**: Space Grotesk (modern, techy)
- **Paragraphs**: Nunito Sans (readable, clean)

### Components
- **Glassmorphism**: Cards with `bg-white/5`, `border-white/10`, `backdrop-blur-sm`
- **Buttons**: Neon teal primary, outlined secondary
- **Animations**: Framer Motion for smooth transitions

## Next Steps for Production

### Email Integration
1. Set up Wix Triggered Emails for:
   - Appointment confirmation
   - 24-hour reminder
   - 2-hour reminder
2. Update `sendConfirmationEmail()` and `sendReminderEmail()` functions

### Cron Jobs
1. Configure Wix Cron to run `processAppointmentReminders()` every 10 minutes
2. Configure cleanup job for old slot locks

### Permissions
Ensure database permissions are set correctly:
- **Providers**: Read Anyone, Create/Update Owner
- **Services**: Read Anyone, Create/Update Owner
- **Appointments**: Admin only for create (via backend), Read/Update Owner + Admin
- **SlotLocks**: Admin only

### Testing
1. Test double-booking scenarios
2. Test timezone handling
3. Test email delivery
4. Test reminder scheduling
5. Test slot lock cleanup

## Usage

### For Providers
1. Sign in to access `/pro/dashboard`
2. Set up profile with unique slug
3. Create services with pricing and duration
4. Monitor appointments in Today/Week tabs
5. Share public URL: `/p/{your-slug}`

### For Clients
1. Visit provider's public page: `/p/{slug}`
2. Browse and filter services
3. Select a service to view availability
4. Choose a time slot
5. Fill in booking form
6. Receive confirmation email
7. Receive reminder emails before appointment

## Technical Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion
- **Routing**: React Router
- **State Management**: React Hooks, Zustand (if needed)
- **Database**: Wix Data Collections
- **Authentication**: Wix Members
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Date Handling**: date-fns
