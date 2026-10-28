export type StageKey = 'wait' | 'shooting' | 'shot' | 'editing' | 'delivered' | 'cancelled';
export type BookingType = 'solo' | 'project';

export interface Person { name: string; char: string }

export interface Shot {
  id: string;
  label: string;
  /** indexes into Booking.people */
  who: number[];
  /** planned minutes for this shot inside its time slot */
  min: number;
}

export interface Ref {
  label: string;
  /** uploaded image (resized JPEG data URL) */
  url?: string;
  /** pasted link to an image or a page */
  link?: string;
  /** hue for the generated sample illustration */
  h?: number;
  /** Drive file id when pulled from the booking's Ref folder */
  driveId?: string;
  done: boolean;
  shot: string;
}

/**
 * Timer stored as timestamps so it keeps counting while the app is closed.
 * elapsed = base + (start ? now - start : 0); remaining = total - elapsed.
 */
export interface Timer { total: number; base: number; start: number | null }

export interface Slot {
  id: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  dur: number; // minutes
  place: string;
  /** character for this slot (solo bookings can change character per slot) */
  char: string | null;
  shots: Shot[];
  refs: Ref[];
  t: Timer;
  /** index of the ref being viewed on the shoot screen */
  ri: number;
  /** selected shot tab on the shoot screen: a shot id or 'all' */
  sel: string;
  done: boolean;
}

export interface RefFolder { id?: string; url: string; path: string }

export interface Booking {
  id: number;
  type: BookingType;
  name: string;
  series: string;
  price: number;
  paid: number;
  people: Person[];
  leader: number;
  stage: StageKey;
  slots: Slot[];
  refFolder?: RefFolder;
}

/** One booking seen through one of its time slots: what a card on Today / Calendar shows. */
export interface Occ { id: number; b: Booking; sl: Slot; no: number; count: number }

export interface Pkg { name: string; dur: number; price: number }

export interface Cfg {
  packages: Pkg[];
  places: string[];
  warnMin: number;
  sound: boolean;
  groupPct: number;
  warnDays: number;
  badDays: number;
  theme: 'light' | 'dark';
  weekStart: 0 | 1;
  era: 'be' | 'ce';
}

export interface DriveInfo {
  email?: string;
  name?: string;
  picture?: string;
  rootId?: string;
  fileId?: string | null;
  lastSync?: number;
}

export interface SavedState {
  v: 2;
  updatedAt: number;
  cfg: Cfg;
  drive: DriveInfo | null;
  shoots: Booking[];
}
