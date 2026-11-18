export interface TimezoneOption {
  id: string;
  label: string;
  region: string;
}

export interface TimezoneClockSnapshot {
  ianaTimezone: string;
  dateKey: string; // YYYY-MM-DD in selected timezone
  time24: string; // HH:MM:SS
  time12: string; // hh:MM:SS AM/PM
  hh: number;
  mm: number;
  ss: number;
  dateLabel: string;
  offsetMinutes: number;
  offsetLabel: string; // e.g. UTC-08:00
  shortZone: string; // e.g. PST
  utcEpochSeconds: number;
  localEpochSeconds: number;
  dayOfWeek: number; // 0 (Sun) - 6 (Sat)
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { id: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)', region: 'North America' },
  { id: 'America/Denver', label: 'Mountain Time (Denver)', region: 'North America' },
  { id: 'America/Phoenix', label: 'Mountain Time — No DST (Phoenix)', region: 'North America' },
  { id: 'America/Chicago', label: 'Central Time (Chicago)', region: 'North America' },
  { id: 'America/New_York', label: 'Eastern Time (New York)', region: 'North America' },
  { id: 'America/Toronto', label: 'Eastern Time (Toronto)', region: 'North America' },
  { id: 'America/Sao_Paulo', label: 'Brasilia Time (São Paulo)', region: 'South America' },
  { id: 'Europe/London', label: 'Greenwich / British Time (London)', region: 'Europe' },
  { id: 'Europe/Paris', label: 'Central European Time (Paris)', region: 'Europe' },
  { id: 'Europe/Berlin', label: 'Central European Time (Berlin)', region: 'Europe' },
  { id: 'Asia/Dubai', label: 'Gulf Standard Time (Dubai)', region: 'Middle East' },
  { id: 'Asia/Kolkata', label: 'India Standard Time (Kolkata)', region: 'Asia' },
  { id: 'Asia/Singapore', label: 'Singapore Standard Time (Singapore)', region: 'Asia' },
  { id: 'Asia/Tokyo', label: 'Japan Standard Time (Tokyo)', region: 'Asia' },
  { id: 'Asia/Seoul', label: 'Korea Standard Time (Seoul)', region: 'Asia' },
  { id: 'Australia/Sydney', label: 'Australian Eastern Time (Sydney)', region: 'Oceania' },
  { id: 'Pacific/Auckland', label: 'New Zealand Time (Auckland)', region: 'Oceania' },
  { id: 'UTC', label: 'Coordinated Universal Time (UTC)', region: 'Global' },
];

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getAvailableTimezones(): TimezoneOption[] {
  const localTz = getBrowserTimezone();
  const exists = COMMON_TIMEZONES.some((tz) => tz.id === localTz);
  if (exists) {
    return COMMON_TIMEZONES;
  }
  return [
    { id: localTz, label: `Local Browser (${localTz})`, region: 'Detected' },
    ...COMMON_TIMEZONES,
  ];
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatOffsetLabel(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `UTC${sign}${pad2(hours)}:${pad2(mins)}`;
}

export function getTimezoneSnapshot(ianaTimezone: string, nowDate: Date = new Date()): TimezoneClockSnapshot {
  let safeTz = ianaTimezone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: safeTz }).format(nowDate);
  } catch {
    safeTz = 'UTC';
  }

  const partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  });

  const parts = partsFormatter.formatToParts(nowDate);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = part.value;
    }
  }

  const year = Number(map.year);
  const month = Number(map.month);
  const day = Number(map.day);
  const hh = Number(map.hour) % 24;
  const mm = Number(map.minute);
  const ss = Number(map.second);

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const dayOfWeek = weekdayMap[map.weekday] ?? nowDate.getDay();

  const utcSecondsFloored = Math.floor(nowDate.getTime() / 1000);
  const zonedAsUtcMs = Date.UTC(year, month - 1, day, hh, mm, ss);
  const offsetMinutes = Math.round((zonedAsUtcMs - utcSecondsFloored * 1000) / 60000);
  const localEpochSeconds = utcSecondsFloored + offsetMinutes * 60;

  let shortZone = safeTz;
  try {
    const tzNameParts = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTz,
      timeZoneName: 'short',
    }).formatToParts(nowDate);
    const found = tzNameParts.find((p) => p.type === 'timeZoneName');
    if (found?.value) {
      shortZone = found.value;
    }
  } catch {
    shortZone = formatOffsetLabel(offsetMinutes);
  }

  const dateLabel = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(nowDate);

  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const meridiem = hh >= 12 ? 'PM' : 'AM';

  return {
    ianaTimezone: safeTz,
    dateKey: `${year}-${pad2(month)}-${pad2(day)}`,
    time24: `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`,
    time12: `${pad2(hour12)}:${pad2(mm)}:${pad2(ss)} ${meridiem}`,
    hh,
    mm,
    ss,
    dateLabel,
    offsetMinutes,
    offsetLabel: formatOffsetLabel(offsetMinutes),
    shortZone,
    utcEpochSeconds: utcSecondsFloored,
    localEpochSeconds,
    dayOfWeek,
  };
}

export function buildClockSyncCommand(ianaTimezone: string, nowDate: Date = new Date()): {
  command: string;
  snapshot: TimezoneClockSnapshot;
} {
  const snapshot = getTimezoneSnapshot(ianaTimezone, nowDate);
  // ESP32 firmware expects local wall-clock seconds in the form: T <epoch>.
  const command = `T ${snapshot.localEpochSeconds}`;
  return { command, snapshot };
}

export function getMinutesUntilSchedule(scheduledHHMM: string, snapshot: TimezoneClockSnapshot): number {
  const [hStr, mStr] = scheduledHHMM.split(':');
  const targetMin = Number(hStr) * 60 + Number(mStr);
  if (Number.isNaN(targetMin)) return 0;
  const currentMin = snapshot.hh * 60 + snapshot.mm;
  let diff = targetMin - currentMin;
  if (diff < 0) diff += 24 * 60;
  return diff;
}

export function getSignedMinutesDelta(scheduledHHMM: string, snapshot: TimezoneClockSnapshot): number {
  const [hStr, mStr] = scheduledHHMM.split(':');
  const targetMin = Number(hStr) * 60 + Number(mStr);
  if (Number.isNaN(targetMin)) return 0;
  const currentMin = snapshot.hh * 60 + snapshot.mm;
  return targetMin - currentMin;
}

export function addMinutesToHHMM(hhmm: string, addMinutes: number): string {
  const [hStr, mStr] = hhmm.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + addMinutes));
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${pad2(nextH)}:${pad2(nextM)}`;
}

export function formatScheduleTime(scheduledHHMM: string, use24Hour: boolean): string {
  const [hStr, mStr] = scheduledHHMM.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return scheduledHHMM;
  if (use24Hour) {
    return `${pad2(h)}:${pad2(m)}`;
  }
  const meridiem = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${meridiem}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

export function formatIsoTimeInZone(iso: string, timezone: string, use24Hour: boolean): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: !use24Hour,
    });
  } catch {
    return iso;
  }
}
