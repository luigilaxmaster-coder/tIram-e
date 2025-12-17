/**
 * Auto-generated entity types
 * Contains all CMS collection interfaces in a single file 
 */

/**
 * Price option for services with multiple pricing tiers
 */
export interface PriceOption {
  name: string;
  price: number;
}

/**
 * Collection ID: appointments
 * Interface for Appointments
 */
export interface Appointments {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  providerId?: string;
  /** @wixFieldType text */
  serviceId?: string;
  /** @wixFieldType datetime */
  startAt?: Date | string;
  /** @wixFieldType datetime */
  endAt?: Date | string;
  /** @wixFieldType text */
  clientName?: string;
  /** @wixFieldType text */
  clientEmail?: string;
  /** @wixFieldType text */
  clientPhone?: string;
  /** @wixFieldType number */
  peopleCount?: number;
  /** @wixFieldType text */
  notes?: string;
  /** @wixFieldType text */
  status?: string;
  /** @wixFieldType datetime */
  createdAt?: Date | string;
  /** @wixFieldType boolean */
  reminder24hSent?: boolean;
  /** @wixFieldType boolean */
  reminder2hSent?: boolean;
  /** @wixFieldType text */
  googleCalendarEventId?: string;
}


/**
 * Collection ID: providers
 * Interface for Providers
 */
export interface Providers {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  memberId?: string;
  /** @wixFieldType text */
  slug?: string;
  /** @wixFieldType text */
  displayName?: string;
  /** @wixFieldType text */
  categoryTags?: string;
  /** @wixFieldType text */
  addressText?: string;
  /** @wixFieldType text */
  whatsappNumber?: string;
  /** @wixFieldType text */
  contactEmail?: string;
  /** @wixFieldType text */
  timezone?: string;
  /** @wixFieldType boolean */
  isActive?: boolean;
  /** @wixFieldType datetime */
  createdAt?: Date | string;
  /** @wixFieldType datetime */
  updatedAt?: Date | string;
  /** @wixFieldType text */
  googleCalendarData?: string;
}


/**
 * Collection ID: services
 * Interface for Services
 */
export interface Services {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  name?: string;
  /** @wixFieldType text */
  cardColor?: string;
  /** @wixFieldType text */
  priceOptions?: string;
  /** @wixFieldType text */
  category?: string;
  /** @wixFieldType number */
  durationMin?: number;
  /** @wixFieldType number */
  price?: number;
  /** @wixFieldType number */
  maxPeoplePerBooking?: number;
  /** @wixFieldType number */
  bufferBeforeMin?: number;
  /** @wixFieldType number */
  bufferAfterMin?: number;
  /** @wixFieldType boolean */
  isActive?: boolean;
  /** @wixFieldType text */
  textColor?: string;
  /** @wixFieldType text */
  textGradient?: string;
  /** @wixFieldType text */
  serviceSchedule?: string;
}


/**
 * Collection ID: slotlocks
 * Interface for SlotLocks
 */
export interface SlotLocks {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  lockKey?: string;
  /** @wixFieldType text */
  providerId?: string;
  /** @wixFieldType datetime */
  startAt?: Date | string;
  /** @wixFieldType datetime */
  endAt?: Date | string;
  /** @wixFieldType text */
  appointmentId?: string;
  /** @wixFieldType datetime */
  createdAt?: Date | string;
}


/**
 * Collection ID: workinghours
 * Interface for ProviderWorkingHours
 */
export interface ProviderWorkingHours {
  _id: string;
  _createdDate?: Date;
  _updatedDate?: Date;
  /** @wixFieldType text */
  providerId?: string;
  /** @wixFieldType number */
  dayOfWeek?: number;
  /** @wixFieldType time */
  startTime?: any;
  /** @wixFieldType time */
  endTime?: any;
  /** @wixFieldType boolean */
  isActive?: boolean;
}
