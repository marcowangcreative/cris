import { isRealDate } from "@/lib/civil-date";
import { ValidationError } from "@/lib/errors";
import type { Settings, SettingsAction } from "@/lib/types";

export function applySettingsAction(settings: Settings, action: SettingsAction): Settings {
  const next: Settings = {
    maxEventsPerDate: settings.maxEventsPerDate,
    blockedDates: [...settings.blockedDates],
  };

  if (action.type === "block") {
    if (!isRealDate(action.date)) throw new ValidationError("Choose a real date.");
    next.blockedDates.push(action.date);
  } else if (action.type === "unblock") {
    next.blockedDates = next.blockedDates.filter((date) => date !== action.date);
  } else if (!Number.isInteger(action.maxEventsPerDate)) {
    throw new ValidationError("Max events per date must be a whole number from 1 to 4.");
  } else {
    next.maxEventsPerDate = action.maxEventsPerDate;
  }

  if (!Number.isInteger(next.maxEventsPerDate) || next.maxEventsPerDate < 1 || next.maxEventsPerDate > 4) {
    throw new ValidationError("Max events per date must be a whole number from 1 to 4.");
  }

  return {
    maxEventsPerDate: next.maxEventsPerDate,
    blockedDates: [...new Set(next.blockedDates.filter((date) => isRealDate(date)))].sort(),
  };
}
