export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export type PaymentMode = "full" | "deposit";

export type AddonDefinition = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  priceIsPlaceholder: boolean;
  additionalMinutes: number;
  maxQuantity: number;
};

export type PackageDefinition = {
  id: string;
  name: string;
  summary: string;
  priceCents: number;
  priceIsPlaceholder: boolean;
  durationMinutes: number;
  paymentMode: PaymentMode;
  includes: string[];
  addons: AddonDefinition[];
  bookLabel: string;
  inquireLabel: string;
};

export type AddonSelection = {
  id: string;
  quantity: number;
};

export type LineItem = {
  id: string;
  label: string;
  amountCents: number;
  placeholder: boolean;
};

export type Quote = {
  packageId: string;
  packageName: string;
  currency: "usd";
  durationMinutes: number;
  paymentMode: PaymentMode;
  depositPercent: number;
  lineItems: LineItem[];
  totalCents: number;
  dueNowCents: number;
  balanceDueCents: number;
  includesPlaceholderPrice: boolean;
};

export type Intake = {
  clientName: string;
  clientEmail: string;
  eventName: string;
  venueAddress: string;
  guestHeadcount: number;
  loadInNotes: string;
  onSiteContactName: string;
  onSiteContactPhone: string;
  galleryEmail: string;
};

export type SignedContract = {
  templateVersion: string;
  body: string;
  signerName: string;
  agreed: true;
  signedAt: string;
};

export type PaymentRecord = {
  status: "unpaid" | "paid";
  amountCents: number;
  provider?: "stripe" | "demo";
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paidAt?: string;
};

export type BookingStatus = "held" | "pending_payment" | "paid" | "cancelled";

export type ReminderState = {
  sevenDaySentAt?: string;
  oneDaySentAt?: string;
};

export type Booking = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: BookingStatus;
  packageId: string;
  addons: AddonSelection[];
  date: string;
  startTime: string;
  timezone: string;
  quote: Quote;
  holdExpiresAt: string;
  intake?: Intake;
  contract?: SignedContract;
  payment: PaymentRecord;
  reminders: ReminderState;
  confirmationEmailSentAt?: string;
};

export type Inquiry = {
  id: string;
  createdAt: string;
  packageId: string;
  packageName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  eventDate: string;
  venue: string;
  message: string;
};

export type Settings = {
  maxEventsPerDate: number;
  blockedDates: string[];
};

export type Database = {
  bookings: Booking[];
  inquiries: Inquiry[];
  settings: Settings;
};

export type DayStatus = "open" | "closed" | "blocked" | "full" | "past" | "beyond";

export type DayAvailability = {
  date: string;
  weekday: string;
  status: DayStatus;
  startTimes: string[];
};

export type AvailabilityMonth = {
  month: string;
  firstWeekday: number;
  maxEventsPerDate: number;
  days: DayAvailability[];
};

export type DisplayStatus = BookingStatus | "expired";

export type PublicBooking = Booking & {
  displayStatus: DisplayStatus;
};

export type SettingsAction =
  | { type: "block"; date: string }
  | { type: "unblock"; date: string }
  | { type: "max"; maxEventsPerDate: number };

export type CheckoutSessionSnapshot = {
  id: string;
  amount_total: number | null;
  payment_status?: string | null;
  metadata?: { bookingId?: string } | null;
  payment_intent?: string | { id: string } | null;
};
