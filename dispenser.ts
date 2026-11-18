export type TransportKind = 'disconnected' | 'ble' | 'serial' | 'mqtt';

export type StockLevel = 'full' | 'medium' | 'low' | 'empty';

export interface MqttConfig {
  brokerUrl: string; // e.g. wss://broker.hivemq.com:8884/mqtt
  topicPrefix: string; // e.g. dosecompass/esp32-01
  username: string;
  password: string;
}

export interface DoseDelay {
  slot: number;
  originalTime: string; // "HH:MM"
  delayedToTime: string; // "HH:MM"
  delayMinutes: number;
  dateKey: string; // YYYY-MM-DD in selected timezone so delays reset next day
}

export interface CompartmentSlot {
  slot: number; // 1..13
  medicationName: string;
  dosagePills: number; // Dosage in number of pills (e.g., 1, 2, 3)
  dispenseTimes: string[]; // Multiple "HH:MM" times per day in selected timezone
  days: boolean[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
  stockLevel: StockLevel;
  enabled: boolean;
  startDateKey?: string; // YYYY-MM-DD in selected timezone; saved schedules start next day
  courseDays?: number; // ESP32 firmware supports 1..365 consecutive course days
  lastDispensedAt: string | null; // ISO timestamp
  lastStatus: 'idle' | 'dispensing' | 'dispensed' | 'error';
  lastError?: string;
}

export interface TodayDoseItem {
  key: string; // `${slot}-${originalTime}`
  slot: number;
  medicationName: string;
  dosagePills: number;
  originalTime: string;
  effectiveTime: string;
  delayMinutes: number;
  stockLevel: StockLevel;
  state: 'dispensed' | 'due' | 'upcoming' | 'delayed' | 'missed';
  minutesDelta: number; // minutes until effectiveTime (negative = past)
}

export interface DishSensorState {
  weightGrams: number | null;
  status: 'disconnected' | 'empty' | 'pill_detected' | 'awaiting_drop';
  lastUpdatedAt: string | null;
  lastTaredAt: string | null;
}

export interface AdherenceLogEntry {
  id: string;
  slot: number;
  medicationName: string;
  dosagePills: number;
  scheduledTime: string;
  timezone: string;
  status: 'dispensed' | 'taken' | 'missed' | 'pending' | 'error';
  source: 'ble' | 'serial' | 'mqtt' | 'schedule' | 'manual';
  timestamp: string; // ISO
  note?: string;
}

export interface PacketLogEntry {
  id: string;
  direction: 'tx' | 'rx' | 'info' | 'error';
  transport: TransportKind;
  message: string;
  timestamp: string;
}

export interface HardwareTelemetry {
  deviceName: string | null;
  linkDetail: string | null;
  writeMode: 'without-response' | 'with-response' | 'read-only' | 'serial' | 'mqtt' | null;
  lastRttMs: number | null;
  lastClockSyncAt: string | null;
  lastClockSyncTz: string | null;
  pendingDropSlot: number | null;
}

export interface BluetoothRemoteGATTCharacteristicLike {
  uuid: string;
  properties: {
    read: boolean;
    write: boolean;
    writeWithoutResponse: boolean;
    notify: boolean;
    indicate: boolean;
  };
  value?: DataView;
  startNotifications: () => Promise<BluetoothRemoteGATTCharacteristicLike>;
  stopNotifications: () => Promise<BluetoothRemoteGATTCharacteristicLike>;
  writeValueWithResponse?: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValue: (value: BufferSource) => Promise<void>;
  readValue?: () => Promise<DataView>;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
}

export interface BluetoothRemoteGATTServiceLike {
  uuid: string;
  getCharacteristic: (uuid: string) => Promise<BluetoothRemoteGATTCharacteristicLike>;
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristicLike[]>;
}

export interface BluetoothRemoteGATTServerLike {
  connected: boolean;
  connect: () => Promise<BluetoothRemoteGATTServerLike>;
  disconnect: () => void;
  getPrimaryService: (uuid: string) => Promise<BluetoothRemoteGATTServiceLike>;
  getPrimaryServices: () => Promise<BluetoothRemoteGATTServiceLike[]>;
}

export interface BluetoothDeviceLike {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServerLike;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
}

export interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}
