import type { AddonSelection, Booking, Inquiry, Settings, SettingsAction } from "@/lib/types";

export type HoldInput = {
  packageId: string;
  date: string;
  startTime: string;
  addons: AddonSelection[];
  now?: Date;
};

export interface Store {
  listBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking | null>;
  createHold(input: HoldInput): Promise<Booking>;
  updateBooking(id: string, updater: (current: Booking) => Booking): Promise<Booking>;
  listInquiries(): Promise<Inquiry[]>;
  createInquiry(input: Omit<Inquiry, "id" | "createdAt">): Promise<Inquiry>;
  getSettings(): Promise<Settings>;
  changeSettings(action: SettingsAction): Promise<Settings>;
}
