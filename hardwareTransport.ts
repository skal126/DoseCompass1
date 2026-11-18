import mqtt, { type MqttClient } from 'mqtt';
import type {
  BluetoothDeviceLike,
  BluetoothRemoteGATTCharacteristicLike,
  BluetoothRemoteGATTServerLike,
  MqttConfig,
  SerialPortLike,
  TransportKind,
} from '../types/dispenser';

// Comprehensive list of non-blocklisted BLE GATT Services for Chrome Web Bluetooth
const KNOWN_BLE_SERVICES = [
  // Microcontroller & BLE UART / Serial Bridges
  '6e400001-b5a3-f393-e0a9-e50e24d4cca9', // Nordic UART Service (ESP32, nRF52, Bluefruit, Pico W, micro:bit)
  '4fafc201-1fb5-459e-8fcc-c5c9c331914b', // ESP32 Arduino BLE_server / BLE_notify default
  '19b10000-e8f2-537e-4f6c-d104768a1214', // ArduinoBLE custom DoseCompass / Nano 33 / Uno R4
  'adaf0001-c332-42a8-93bd-25e905756cb8', // Adafruit Bluefruit UART
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / AT-09 / MLT-BT05 / JDY-08 / CC2541
  '0000ffe1-0000-1000-8000-00805f9b34fb', // JDY-10 / generic BLE serial service
  '0000ffe5-0000-1000-8000-00805f9b34fb', // HC-08 / JDY-16 / BLE TX/RX
  '0000ffe9-0000-1000-8000-00805f9b34fb', // Generic BLE module write service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic ESP32 / BLE custom service
  '0000ff10-0000-1000-8000-00805f9b34fb', // Generic BLE UART variant
  '0000ff20-0000-1000-8000-00805f9b34fb', // Generic BLE UART variant 2
  '0000ffa0-0000-1000-8000-00805f9b34fb', // Generic BLE module control
  '0000ffb0-0000-1000-8000-00805f9b34fb', // Generic BLE sensor/control
  '0000ffc0-0000-1000-8000-00805f9b34fb', // Generic BLE control
  '0000ffd0-0000-1000-8000-00805f9b34fb', // Generic BLE control
  '0000fff0-0000-1000-8000-00805f9b34fb', // Widely used ESP32 / Chinese BLE module service
  '000000ff-0000-1000-8000-00805f9b34fb', // ESP-IDF GATT Server example
  '0000dfb0-0000-1000-8000-00805f9b34fb', // DFRobot Bluno BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip RN4870 / BM70 / ISSC Transparent UART
  '65333333-a115-11e2-9e9a-0800200ca100', // Cypress / Infineon CySPP
  '4880c12c-fdcb-4077-8920-a450d7f9b907', // Silicon Labs BLE SPP
  '569a1101-b87f-490c-92cb-11ba5ea5167c', // Laird BL600 / BL652 vSP
  '2456e1b9-26e2-8f83-e744-f34f01e9d701', // u-blox Serial Port Service (SPS)
  '713d0000-503e-4c75-ba94-3148f18d941e', // RedBearLab BLE Nano / Blend
  '0000fefb-0000-1000-8000-00805f9b34fb', // Telit / Stollmann Terminal IO
  '0000fee0-0000-1000-8000-00805f9b34fb', // Generic wearable/sensor UART
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / generic BLE bridge
  '0000ae00-0000-1000-8000-00805f9b34fb', // Generic BLE serial bridge (JDY-23/24)
  '0000ae30-0000-1000-8000-00805f9b34fb', // Generic BLE serial bridge (JDY-30/31)
  '0000abf0-0000-1000-8000-00805f9b34fb', // ESP32 SPP-over-BLE example
  '0000fe40-cc7a-482a-984a-7f2ed5b3e58f', // STM32 STBLE P2P Server
  '00001523-1212-efde-1523-785feabcd123', // Nordic LBS / custom dev kits
  'e95d93af-251d-470a-a062-fa1922dfa9a8', // BBC micro:bit Event Service
  'e95d127b-251d-470a-a062-fa1922dfa9a8', // BBC micro:bit IO Pin Service
  'f000aa00-0451-4000-b000-000000000000', // TI CC2640/CC2650 SensorTag / SimpleLink
  '12345678-1234-5678-1234-56789abcdef0', // Common tutorial custom UUID
  '00000001-0000-1000-8000-00805f9b34fb', // Generic custom service 0001
  '0000aaaa-0000-1000-8000-00805f9b34fb', // Generic custom service AAAA
  '0000abcd-0000-1000-8000-00805f9b34fb', // Generic custom service ABCD
  '00001234-0000-1000-8000-00805f9b34fb', // Generic custom service 1234
  // Standard Adopted GATT Services
  '0000181d-0000-1000-8000-00805f9b34fb', // Weight Scale Service (WSS)
  '0000181b-0000-1000-8000-00805f9b34fb', // Body Composition
  '0000181a-0000-1000-8000-00805f9b34fb', // Environmental Sensing
  '00001815-0000-1000-8000-00805f9b34fb', // Automation IO
  '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate
  '00001809-0000-1000-8000-00805f9b34fb', // Health Thermometer
  '00001810-0000-1000-8000-00805f9b34fb', // Blood Pressure
  '00001808-0000-1000-8000-00805f9b34fb', // Glucose
  '00001822-0000-1000-8000-00805f9b34fb', // Pulse Oximeter
  '00001805-0000-1000-8000-00805f9b34fb', // Current Time Service
  '00001802-0000-1000-8000-00805f9b34fb', // Immediate Alert
  '00001803-0000-1000-8000-00805f9b34fb', // Link Loss
  '00001804-0000-1000-8000-00805f9b34fb', // Tx Power
  '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
  '0000180a-0000-1000-8000-00805f9b34fb', // Device Information
  '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
  '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
];

const KNOWN_RX_CHARS = [
  '6e400002-b5a3-f393-e0a9-e50e24d4cca9', // NUS RX
  '19b10001-e8f2-537e-4f6c-d104768a1214', // ArduinoBLE RX
  'beb5483e-36e1-4688-b7f5-ea07361b26a8', // ESP32 BLE_server default char
  'adaf0002-c332-42a8-93bd-25e905756cb8', // Adafruit Bluefruit RX
  '0000ffe1-0000-1000-8000-00805f9b34fb', // HM-10 RW
  '0000ffe9-0000-1000-8000-00805f9b34fb', // Generic BLE RX
  '0000fff2-0000-1000-8000-00805f9b34fb', // FFF0 RX
  '0000ff01-0000-1000-8000-00805f9b34fb', // FF00 RX
  '0000dfb1-0000-1000-8000-00805f9b34fb', // DFRobot Bluno Serial
  '49535343-8841-43f4-a8d4-ecbe34729bb3', // Microchip ISSC RX
  '65333333-a115-11e2-9e9a-0800200ca101', // Cypress CySPP RX
  '569a2001-b87f-490c-92cb-11ba5ea5167c', // Laird vSP RX
  '2456e1b9-26e2-8f83-e744-f34f01e9d702', // u-blox SPS FIFO
  '713d0003-503e-4c75-ba94-3148f18d941e', // RedBearLab RX
  '0000fe41-8e22-4541-9d4c-21edae82ed19', // STM32 P2P Write
  '0000ae01-0000-1000-8000-00805f9b34fb', // JDY-23 RX
  '0000abf1-0000-1000-8000-00805f9b34fb', // ESP32 SPP-BLE RX
];

const KNOWN_TX_CHARS = [
  '6e400003-b5a3-f393-e0a9-e50e24d4cca9', // NUS TX
  '13187b10-80a2-4a00-a2ef-98844e135540', // Attached ESP32 medicine-dispenser telemetry
  '19b10002-e8f2-537e-4f6c-d104768a1214', // ArduinoBLE TX
  'beb5483e-36e1-4688-b7f5-ea07361b26a8', // ESP32 BLE_server default char
  'adaf0003-c332-42a8-93bd-25e905756cb8', // Adafruit Bluefruit TX
  '0000ffe1-0000-1000-8000-00805f9b34fb', // HM-10 RW
  '0000ffe4-0000-1000-8000-00805f9b34fb', // Generic BLE TX
  '0000fff1-0000-1000-8000-00805f9b34fb', // FFF0 TX
  '0000ff02-0000-1000-8000-00805f9b34fb', // FF00 TX
  '0000dfb1-0000-1000-8000-00805f9b34fb', // DFRobot Bluno Serial
  '49535343-1e4d-4bd9-ba61-23c647249616', // Microchip ISSC TX
  '65333333-a115-11e2-9e9a-0800200ca102', // Cypress CySPP TX
  '569a2000-b87f-490c-92cb-11ba5ea5167c', // Laird vSP TX
  '2456e1b9-26e2-8f83-e744-f34f01e9d702', // u-blox SPS FIFO
  '713d0002-503e-4c75-ba94-3148f18d941e', // RedBearLab TX
  '0000fe42-8e22-4541-9d4c-21edae82ed19', // STM32 P2P Notify
  '0000ae02-0000-1000-8000-00805f9b34fb', // JDY-23 TX
  '0000abf2-0000-1000-8000-00805f9b34fb', // ESP32 SPP-BLE TX
  '00002a9d-0000-1000-8000-00805f9b34fb', // Standard BLE Weight Measurement
];

// Non-sensor GATT metadata characteristics that should never be polled as HX711 grams
const METADATA_BLE_CHARS = new Set([
  '00002a00-0000-1000-8000-00805f9b34fb', // Device Name
  '00002a01-0000-1000-8000-00805f9b34fb', // Appearance
  '00002a02-0000-1000-8000-00805f9b34fb', // Peripheral Privacy Flag
  '00002a04-0000-1000-8000-00805f9b34fb', // Preferred Connection Parameters
  '00002a05-0000-1000-8000-00805f9b34fb', // Service Changed
  '00002a19-0000-1000-8000-00805f9b34fb', // Battery Level
  '00002a23-0000-1000-8000-00805f9b34fb', // System ID
  '00002a24-0000-1000-8000-00805f9b34fb', // Model Number
  '00002a25-0000-1000-8000-00805f9b34fb', // Serial Number
  '00002a26-0000-1000-8000-00805f9b34fb', // Firmware Revision
  '00002a27-0000-1000-8000-00805f9b34fb', // Hardware Revision
  '00002a28-0000-1000-8000-00805f9b34fb', // Software Revision
  '00002a29-0000-1000-8000-00805f9b34fb', // Manufacturer Name
  '00002a2a-0000-1000-8000-00805f9b34fb', // IEEE Cert
  '00002a50-0000-1000-8000-00805f9b34fb', // PnP ID
]);

const STANDARD_NON_UART_SERVICES = new Set([
  '00001800-0000-1000-8000-00805f9b34fb',
  '00001801-0000-1000-8000-00805f9b34fb',
  '00001805-0000-1000-8000-00805f9b34fb',
  '0000180a-0000-1000-8000-00805f9b34fb',
  '0000180f-0000-1000-8000-00805f9b34fb',
]);

export const USB_SERIAL_BAUD_RATE = 115200;

export interface TransportCallbacks {
  onStateChange: (state: {
    transport: TransportKind;
    deviceName: string | null;
    linkDetail: string | null;
    writeMode: 'without-response' | 'with-response' | 'read-only' | 'serial' | 'mqtt' | null;
  }) => void;
  onLineReceived: (line: string, options?: { silent?: boolean }) => void;
  onLog: (direction: 'tx' | 'rx' | 'info' | 'error', message: string) => void;
}

interface NavigatorWithHardware extends Navigator {
  bluetooth?: {
    getAvailability?: () => Promise<boolean>;
    requestDevice: (options: {
      filters?: Array<{ services?: string[]; namePrefix?: string }>;
      optionalServices?: string[];
      acceptAllDevices?: boolean;
    }) => Promise<BluetoothDeviceLike>;
  };
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
}

const BLE_CHUNK_SIZE = 20;
const INTER_CHUNK_DELAY_MS = 18;
const COMMAND_TIMEOUT_MS = 6500;
const RX_FLUSH_DELAY_MS = 65;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUuid(uuid: string): string | null {
  const trimmed = uuid.trim().toLowerCase();
  if (/^[0-9a-f]{4}$/.test(trimmed)) {
    return `0000${trimmed}-0000-1000-8000-00805f9b34fb`;
  }
  if (/^0x[0-9a-f]{4}$/.test(trimmed)) {
    return `0000${trimmed.slice(2)}-0000-1000-8000-00805f9b34fb`;
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

class HardwareTransportManager {
  private callbacks: TransportCallbacks | null = null;
  private transport: TransportKind = 'disconnected';

  // BLE state
  private bleDevice: BluetoothDeviceLike | null = null;
  private bleServer: BluetoothRemoteGATTServerLike | null = null;
  private rxChar: BluetoothRemoteGATTCharacteristicLike | null = null;
  private notifyChars: BluetoothRemoteGATTCharacteristicLike[] = [];
  private readableChars: BluetoothRemoteGATTCharacteristicLike[] = [];
  private writeMode:
    | 'without-response'
    | 'with-response'
    | 'read-only'
    | 'serial'
    | 'mqtt'
    | null = null;

  // Serial state
  private serialPort: SerialPortLike | null = null;
  private serialReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private serialWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private serialReadAbort = false;

  // MQTT state
  private mqttClient: MqttClient | null = null;
  private mqttRxTopic = '';

  // Shared RX framing & sequential TX queue
  private rxBuffer = '';
  private rxFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private txQueue: Promise<void> = Promise.resolve();
  private txInFlight = false;
  private textEncoder = new TextEncoder();
  private textDecoder = new TextDecoder();

  private ackWaiters: Array<{
    matcher: (line: string) => boolean;
    resolve: (line: string) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  public setCallbacks(callbacks: TransportCallbacks): void {
    this.callbacks = callbacks;
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && Boolean((navigator as NavigatorWithHardware).bluetooth);
  }

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && Boolean((navigator as NavigatorWithHardware).serial);
  }

  public isInsideIframe(): boolean {
    try {
      return typeof window !== 'undefined' && window.self !== window.top;
    } catch {
      return true;
    }
  }

  public getTransport(): TransportKind {
    return this.transport;
  }

  public canWrite(): boolean {
    if (this.transport === 'disconnected') return false;
    if (this.transport === 'ble') return Boolean(this.rxChar && this.bleServer?.connected);
    return true;
  }

  public isBusy(): boolean {
    return this.txInFlight;
  }

  private emitLog(direction: 'tx' | 'rx' | 'info' | 'error', message: string): void {
    this.callbacks?.onLog(direction, message);
  }

  private emitState(deviceName: string | null, linkDetail: string | null): void {
    this.callbacks?.onStateChange({
      transport: this.transport,
      deviceName,
      linkDetail,
      writeMode: this.writeMode,
    });
  }

  private handleBleDisconnected = (): void => {
    this.emitLog('info', 'Bluetooth device disconnected');
    void this.cleanupConnections(false);
  };

  private handleCharacteristicValueChanged = (event: Event): void => {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristicLike | null;
    if (!target?.value) return;
    const decoded = this.decodeDataView(target.value, target.uuid);
    if (decoded) {
      // The attached ESP32 sends one complete protocol message per GATT
      // notification without a newline delimiter. Do not merge adjacent
      // notifications (e.g. SERVO DONE followed by ACK:DISPENSED).
      if (target.uuid.toLowerCase() === '13187b10-80a2-4a00-a2ef-98844e135540') {
        this.dispatchLine(decoded.trim(), false);
      } else {
        this.processIncomingChunk(decoded);
      }
    }
  };

  private decodeDataView(view: DataView, charUuid?: string): string {
    if (charUuid?.toLowerCase().startsWith('00002a9d') && view.byteLength >= 3) {
      const flags = view.getUint8(0);
      const rawWeight = view.getUint16(1, true);
      const isImperial = (flags & 0x01) === 1;
      const grams = isImperial ? rawWeight * 4.53592 : rawWeight * 5;
      return `DISH:${grams.toFixed(2)}\n`;
    }
    const raw = this.textDecoder.decode(
      view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength),
    );
    // If printable ASCII/UTF-8 text, use it directly
    if (/^[\x09\x0A\x0D\x20-\x7E]+$/.test(raw)) {
      return raw;
    }
    // Fallback: some BLE load-cell sketches send a 4-byte little-endian float32 weight
    if (view.byteLength === 4) {
      const floatVal = view.getFloat32(0, true);
      if (Number.isFinite(floatVal) && Math.abs(floatVal) < 10000) {
        return `DISH:${Math.max(0, floatVal).toFixed(2)}\n`;
      }
    }
    // Or 2-byte uint16 weight in hundredths of a gram
    if (view.byteLength === 2) {
      const intVal = view.getUint16(0, true) / 100;
      return `DISH:${intVal.toFixed(2)}\n`;
    }
    return raw.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  }

  private clearRxFlushTimer(): void {
    if (this.rxFlushTimer !== null) {
      clearTimeout(this.rxFlushTimer);
      this.rxFlushTimer = null;
    }
  }

  private dispatchLine(line: string, silent: boolean = false): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (!silent) {
      this.emitLog('rx', trimmed);
    }
    this.resolveWaiters(trimmed);
    this.callbacks?.onLineReceived(trimmed, { silent });
  }

  private processIncomingChunk(chunk: string): void {
    this.clearRxFlushTimer();
    this.rxBuffer += chunk;
    const normalized = this.rxBuffer.replace(/\r\n?/g, '\n');
    const lines = normalized.split('\n');
    this.rxBuffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      this.dispatchLine(rawLine, false);
    }

    // Flush BLE notifications that omit a trailing '\n' after a brief 65ms reassembly window
    if (this.rxBuffer.trim().length > 0) {
      this.rxFlushTimer = setTimeout(() => {
        const pending = this.rxBuffer;
        this.rxBuffer = '';
        this.rxFlushTimer = null;
        this.dispatchLine(pending, false);
      }, RX_FLUSH_DELAY_MS);
    }
  }

  private resolveWaiters(line: string): void {
    const remaining: typeof this.ackWaiters = [];
    for (const waiter of this.ackWaiters) {
      if (waiter.matcher(line)) {
        clearTimeout(waiter.timer);
        waiter.resolve(line);
      } else {
        remaining.push(waiter);
      }
    }
    this.ackWaiters = remaining;
  }

  private rejectAllWaiters(reason: string): void {
    for (const waiter of this.ackWaiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error(reason));
    }
    this.ackWaiters = [];
  }

  public async connectBluetooth(customServiceUuid?: string): Promise<{
    deviceName: string;
    linkDetail: string;
    canWrite: boolean;
  }> {
    const nav = navigator as NavigatorWithHardware;
    if (!nav.bluetooth) {
      throw new Error(
        'Chrome Web Bluetooth API is unavailable in this browser. Open in Chrome (Windows/macOS/Linux/Android) over HTTPS, or Bluefy on iOS.',
      );
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      throw new Error('Chrome Web Bluetooth requires a secure HTTPS context.');
    }

    if (nav.bluetooth.getAvailability) {
      try {
        const available = await nav.bluetooth.getAvailability();
        if (!available) {
          throw new Error(
            'No Bluetooth adapter detected or Bluetooth is disabled in system settings.',
          );
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('No Bluetooth adapter')) {
          throw err;
        }
      }
    }

    await this.disconnect();

    const optionalServices = [...KNOWN_BLE_SERVICES];
    if (customServiceUuid?.trim()) {
      const customList = customServiceUuid
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const rawUuid of customList) {
        const normalized = normalizeUuid(rawUuid);
        if (!normalized) {
          throw new Error(
            `Invalid Bluetooth Service UUID "${rawUuid}". Use a 4-character hex ID (e.g. ffe0) or full 36-character UUID.`,
          );
        }
        if (!optionalServices.includes(normalized)) {
          optionalServices.unshift(normalized);
        }
      }
    }

    this.emitLog('info', 'Opening Chrome Bluetooth device picker (all BLE devices)...');

    let device: BluetoothDeviceLike;
    try {
      device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('permissions policy') || msg.toLowerCase().includes('disallowed')) {
        throw new Error(
          'Chrome blocked Web Bluetooth inside this embedded preview iframe. Open the app in its own Chrome tab ("Open in New Tab") to pair with your device, or use USB Serial / MQTT here.',
        );
      }
      if (msg.toLowerCase().includes('user cancelled')) {
        throw new Error('Bluetooth pairing cancelled.');
      }
      throw new Error(`Chrome Bluetooth picker error: ${msg}`);
    }

    this.bleDevice = device;
    device.addEventListener('gattserverdisconnected', this.handleBleDisconnected);

    if (!device.gatt) {
      throw new Error('Selected Bluetooth device does not expose a GATT server.');
    }

    const deviceLabel = device.name || device.id;
    this.emitLog('info', `Connecting GATT to ${deviceLabel}...`);

    let server: BluetoothRemoteGATTServerLike | null = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        server = await Promise.race([
          device.gatt.connect(),
          sleep(9000).then(() => {
            throw new Error(
              'GATT connection timed out. Keep the device close, disconnect other phone/BLE apps from it, and retry.',
            );
          }),
        ]);
        await sleep(260);
        if (server.connected) break;
      } catch (err) {
        if (attempt === 2) throw err;
        this.emitLog('info', 'Retrying Bluetooth GATT handshake...');
        await sleep(350);
      }
    }

    if (!server || !server.connected) {
      throw new Error(`${deviceLabel} disconnected immediately after GATT handshake.`);
    }

    this.bleServer = server;

    let rxChar: BluetoothRemoteGATTCharacteristicLike | null = null;
    let fallbackNonStandardWrite: BluetoothRemoteGATTCharacteristicLike | null = null;
    let fallbackStandardWrite: BluetoothRemoteGATTCharacteristicLike | null = null;
    let matchedServiceUuid = '';
    const allNotifiable: BluetoothRemoteGATTCharacteristicLike[] = [];
    const allReadable: BluetoothRemoteGATTCharacteristicLike[] = [];

    try {
      let services: Awaited<ReturnType<BluetoothRemoteGATTServerLike['getPrimaryServices']>> = [];
      for (let sAttempt = 1; sAttempt <= 2; sAttempt++) {
        try {
          services = await server.getPrimaryServices();
          if (services.length > 0 || sAttempt === 2) break;
        } catch (err) {
          if (sAttempt === 2) throw err;
          await sleep(320);
        }
      }

      this.emitLog('info', `Discovered ${services.length} GATT service(s) on ${deviceLabel}`);

      for (const svc of services) {
        const svcUuidLower = svc.uuid.toLowerCase();
        const isStandardNonUart = STANDARD_NON_UART_SERVICES.has(svcUuidLower);

        let chars: BluetoothRemoteGATTCharacteristicLike[] = [];
        try {
          chars = await svc.getCharacteristics();
        } catch {
          // Skip restricted/system services so they never abort discovery
          continue;
        }

        for (const c of chars) {
          const charUuidLower = c.uuid.toLowerCase();
          const isMetadata = METADATA_BLE_CHARS.has(charUuidLower);
          const isWritable = c.properties.write || c.properties.writeWithoutResponse;

          if (!isMetadata && (c.properties.notify || c.properties.indicate)) {
            allNotifiable.push(c);
          }
          if (!isMetadata && c.properties.read && !KNOWN_RX_CHARS.includes(charUuidLower)) {
            allReadable.push(c);
          }

          if (isWritable) {
            if (!rxChar && KNOWN_RX_CHARS.includes(charUuidLower)) {
              rxChar = c;
              matchedServiceUuid = svc.uuid;
            } else if (!isStandardNonUart && !fallbackNonStandardWrite) {
              fallbackNonStandardWrite = c;
              if (!matchedServiceUuid) matchedServiceUuid = svc.uuid;
            } else if (!fallbackStandardWrite) {
              fallbackStandardWrite = c;
              if (!matchedServiceUuid) matchedServiceUuid = svc.uuid;
            }
          }
        }
      }

      if (!rxChar) {
        rxChar = fallbackNonStandardWrite ?? fallbackStandardWrite;
      }
    } catch (err) {
      await this.cleanupConnections(true);
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Connected to ${deviceLabel}, but Chrome could not discover usable GATT services (${msg}). If this device uses a custom BLE Service UUID, paste it in "Device not connecting? Enter custom Service UUID(s)". If it is a Classic Bluetooth module (HC-05/HC-06 or ESP32 BluetoothSerial), pair it in OS Bluetooth settings and connect via the USB Serial / Bluetooth COM (115200) tab.`,
      );
    }

    if (!rxChar && allNotifiable.length === 0 && allReadable.length === 0) {
      await this.cleanupConnections(true);
      throw new Error(
        `Connected to ${deviceLabel}, but it only exposed standard device-info/battery services with no writable or sensor characteristics. If it uses a custom Service UUID, paste it under "Enter custom Service UUID(s)". For Classic Bluetooth SPP (HC-05/HC-06), use the USB Serial / Bluetooth COM (115200) tab.`,
      );
    }

    this.rxChar = rxChar;
    this.readableChars = allReadable;
    this.writeMode = rxChar
      ? rxChar.properties.writeWithoutResponse
        ? 'without-response'
        : 'with-response'
      : 'read-only';

    // Subscribe to ALL non-metadata notifiable characteristics (captures UART TX & HX711 sensor streams)
    const orderedNotify = [
      ...allNotifiable.filter((c) => KNOWN_TX_CHARS.includes(c.uuid.toLowerCase())),
      ...allNotifiable.filter((c) => !KNOWN_TX_CHARS.includes(c.uuid.toLowerCase())),
    ];

    let enabledNotifyCount = 0;
    for (const char of orderedNotify) {
      try {
        char.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged);
        await char.startNotifications();
        this.notifyChars.push(char);
        enabledNotifyCount++;
        this.emitLog('info', `Subscribed to BLE notify ${char.uuid.slice(0, 8)}`);
      } catch {
        char.removeEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged);
        if (char.properties.read && !this.readableChars.includes(char)) {
          this.readableChars.push(char);
        }
        this.emitLog(
          'info',
          `Notify unavailable on ${char.uuid.slice(0, 8)}; polling readable characteristic instead.`,
        );
      }
    }

    if (!rxChar) {
      this.emitLog(
        'info',
        `Connected in read-only/sensor mode (${enabledNotifyCount} notify, ${this.readableChars.length} readable).`,
      );
    }

    const linkDetail = `BLE ${matchedServiceUuid ? matchedServiceUuid.slice(0, 8) : 'GATT'} (${enabledNotifyCount} notify · ${this.writeMode})`;
    this.transport = 'ble';
    this.emitState(deviceLabel, linkDetail);
    this.emitLog('info', `Bluetooth ready: ${deviceLabel}`);

    return {
      deviceName: deviceLabel,
      linkDetail,
      canWrite: Boolean(rxChar),
    };
  }

  public async connectSerial(): Promise<{ deviceName: string; linkDetail: string }> {
    const nav = navigator as NavigatorWithHardware;
    if (!nav.serial) {
      throw new Error('Chrome Web Serial API is unavailable in this browser.');
    }

    await this.disconnect();

    this.emitLog('info', `Opening Serial / Bluetooth COM picker (${USB_SERIAL_BAUD_RATE} baud)...`);
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: USB_SERIAL_BAUD_RATE });

    this.serialPort = port;
    this.serialReadAbort = false;
    this.writeMode = 'serial';
    this.transport = 'serial';

    if (port.writable) {
      this.serialWriter = port.writable.getWriter();
    }

    const info = port.getInfo?.();
    const deviceName = info?.usbVendorId
      ? `USB ESP32/Arduino (0x${info.usbVendorId.toString(16).toUpperCase()})`
      : 'Serial / Bluetooth COM Port';
    const linkDetail = `Serial · ${USB_SERIAL_BAUD_RATE} baud`;

    this.emitState(deviceName, linkDetail);
    this.emitLog('info', `Serial port connected at ${USB_SERIAL_BAUD_RATE} baud`);

    void this.readSerialLoop(port);

    return { deviceName, linkDetail };
  }

  private async readSerialLoop(port: SerialPortLike): Promise<void> {
    if (!port.readable) return;
    const reader = port.readable.getReader();
    this.serialReader = reader;

    try {
      while (!this.serialReadAbort) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          this.processIncomingChunk(this.textDecoder.decode(value, { stream: true }));
        }
      }
    } catch (err) {
      if (!this.serialReadAbort) {
        const msg = err instanceof Error ? err.message : 'Serial read error';
        this.emitLog('error', msg);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Ignore
      }
      this.serialReader = null;
      if (!this.serialReadAbort && this.transport === 'serial') {
        void this.cleanupConnections(false);
      }
    }
  }

  public async connectMqtt(config: MqttConfig): Promise<{
    deviceName: string;
    linkDetail: string;
  }> {
    const brokerUrl = config.brokerUrl.trim();
    const prefix = config.topicPrefix.trim().replace(/\/+$/, '');
    if (!brokerUrl) {
      throw new Error('MQTT WebSocket broker URL is required (e.g. wss://broker.hivemq.com:8884/mqtt).');
    }
    if (!prefix) {
      throw new Error('MQTT topic prefix is required (e.g. dosecompass/esp32-01).');
    }

    await this.disconnect();

    this.emitLog('info', `Connecting MQTT over WebSockets to ${brokerUrl}...`);

    const client = mqtt.connect(brokerUrl, {
      clientId: `dosecompass-web-${Math.random().toString(16).slice(2, 8)}`,
      username: config.username.trim() || undefined,
      password: config.password || undefined,
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 4000,
    });

    this.mqttClient = client;
    this.mqttRxTopic = `${prefix}/rx`;
    const txTopic = `${prefix}/tx`;
    const dishTopic = `${prefix}/dish`;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.end(true);
        reject(new Error('MQTT broker connection timed out (8s). Check WSS URL and network.'));
      }, 8500);

      client.once('connect', () => {
        clearTimeout(timeout);
        client.subscribe([txTopic, dishTopic], { qos: 1 }, (subErr) => {
          if (subErr) {
            reject(new Error(`MQTT subscribe failed: ${subErr.message}`));
          } else {
            resolve();
          }
        });
      });

      client.once('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`MQTT error: ${err.message}`));
      });
    });

    client.on('message', (topic, payload) => {
      const text = payload.toString('utf-8').trim();
      if (!text) return;
      if (topic === dishTopic && !text.startsWith('DISH:') && !text.startsWith('WEIGHT:')) {
        this.processIncomingChunk(`DISH:${text}\n`);
      } else {
        this.processIncomingChunk(`${text}\n`);
      }
    });

    client.on('close', () => {
      if (this.transport === 'mqtt') {
        this.emitLog('info', 'MQTT connection closed');
      }
    });

    this.transport = 'mqtt';
    this.writeMode = 'mqtt';
    const deviceName = `MQTT (${prefix})`;
    const linkDetail = `WSS · ${txTopic}`;
    this.emitState(deviceName, linkDetail);
    this.emitLog('info', `MQTT connected & subscribed to ${txTopic}, ${dishTopic}`);

    return { deviceName, linkDetail };
  }

  public async disconnect(): Promise<void> {
    await this.cleanupConnections(true);
  }

  private async cleanupConnections(explicitDisconnect: boolean): Promise<void> {
    this.serialReadAbort = true;
    this.clearRxFlushTimer();
    this.rejectAllWaiters(explicitDisconnect ? 'Disconnected' : 'Connection lost');
    this.rxBuffer = '';

    for (const char of this.notifyChars) {
      char.removeEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged);
      try {
        if (this.bleServer?.connected) {
          await char.stopNotifications();
        }
      } catch {
        // Ignore
      }
    }
    this.notifyChars = [];
    this.readableChars = [];
    this.rxChar = null;

    if (this.bleDevice) {
      this.bleDevice.removeEventListener('gattserverdisconnected', this.handleBleDisconnected);
    }

    if (explicitDisconnect && this.bleServer?.connected) {
      try {
        this.bleServer.disconnect();
      } catch {
        // Ignore
      }
    }
    this.bleServer = null;
    this.bleDevice = null;

    if (this.serialReader) {
      try {
        await this.serialReader.cancel();
      } catch {
        // Ignore
      }
      this.serialReader = null;
    }

    if (this.serialWriter) {
      try {
        this.serialWriter.releaseLock();
      } catch {
        // Ignore
      }
      this.serialWriter = null;
    }

    if (this.serialPort) {
      try {
        await this.serialPort.close();
      } catch {
        // Ignore
      }
      this.serialPort = null;
    }

    if (this.mqttClient) {
      try {
        this.mqttClient.end(true);
      } catch {
        // Ignore
      }
      this.mqttClient = null;
      this.mqttRxTopic = '';
    }

    this.transport = 'disconnected';
    this.writeMode = null;
    this.emitState(null, null);
  }

  private async writeBleSlice(
    char: BluetoothRemoteGATTCharacteristicLike,
    slice: Uint8Array<ArrayBuffer>,
  ): Promise<void> {
    if (
      this.writeMode === 'without-response' &&
      char.properties.writeWithoutResponse &&
      char.writeValueWithoutResponse
    ) {
      try {
        await char.writeValueWithoutResponse(slice);
        return;
      } catch {
        this.writeMode = 'with-response';
      }
    }

    if (char.properties.write && char.writeValueWithResponse) {
      try {
        await char.writeValueWithResponse(slice);
        return;
      } catch {
        // Fall through to legacy writeValue or writeWithoutResponse
      }
    }

    if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) {
      try {
        await char.writeValueWithoutResponse(slice);
        this.writeMode = 'without-response';
        return;
      } catch {
        // Fall through to legacy writeValue
      }
    }

    await char.writeValue(slice);
  }

  public sendCommand(rawCommand: string, options?: { silent?: boolean }): Promise<void> {
    const cleanCmd = rawCommand.trim();
    const line = `${cleanCmd}\n`;
    const silent = options?.silent ?? false;

    const next = this.txQueue.then(async () => {
      if (this.transport === 'disconnected') {
        throw new Error('No hardware connected. Pair via Bluetooth, USB Serial, or MQTT first.');
      }

      this.txInFlight = true;
      try {
        const bytes = this.textEncoder.encode(line);

        if (this.transport === 'ble') {
          if (!this.bleServer?.connected) {
            throw new Error('Bluetooth connection is no longer active.');
          }
          if (!this.rxChar) {
            throw new Error(
              'Connected Bluetooth device is read-only/sensor-only and does not expose a writable command characteristic.',
            );
          }

          for (let offset = 0; offset < bytes.length; offset += BLE_CHUNK_SIZE) {
            const slice = bytes.slice(offset, offset + BLE_CHUNK_SIZE);
            await this.writeBleSlice(this.rxChar, slice);

            if (offset + BLE_CHUNK_SIZE < bytes.length) {
              await sleep(INTER_CHUNK_DELAY_MS);
            }
          }
        } else if (this.transport === 'serial') {
          if (!this.serialWriter) {
            throw new Error('Serial writer unavailable.');
          }
          await this.serialWriter.write(bytes);
        } else if (this.transport === 'mqtt') {
          if (!this.mqttClient || !this.mqttClient.connected) {
            throw new Error('MQTT client is not connected.');
          }
          await new Promise<void>((resolve, reject) => {
            this.mqttClient!.publish(this.mqttRxTopic, cleanCmd, { qos: 1 }, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }

        if (!silent) {
          this.emitLog('tx', cleanCmd);
        }
      } finally {
        this.txInFlight = false;
      }
    });

    this.txQueue = next.catch(() => undefined);
    return next;
  }

  /**
   * Queued sensor poll: reads any readable BLE sensor characteristics (e.g. HX711 weight char)
   * without causing GATT collisions.
   */
  public pollDishSensor(silent: boolean = true): Promise<void> {
    const next = this.txQueue.then(async () => {
      if (this.transport === 'disconnected') return;

      this.txInFlight = true;
      try {
        if (this.transport === 'ble' && this.bleServer?.connected) {
          for (const char of this.readableChars) {
            if (char.readValue) {
              try {
                const view = await char.readValue();
                const text = this.decodeDataView(view, char.uuid).trim();
                if (text) {
                  this.dispatchLine(text, silent);
                }
              } catch {
                // Ignore read failure on non-sensor characteristic
              }
            }
          }
        }
      } finally {
        this.txInFlight = false;
      }
    });

    this.txQueue = next.catch(() => undefined);
    return next;
  }

  /** Write a raw UTF-8 payload to the ESP32 BLE GATT RX characteristic.
   * The current medicine-dispenser firmware expects a single digit (0..3)
   * with NO newline; this is intentionally separate from line-oriented Serial.
   */
  public sendBlePayload(payload: string): Promise<void> {
    const next = this.txQueue.then(async () => {
      if (this.transport !== 'ble' || !this.bleServer?.connected || !this.rxChar) {
        throw new Error('Raw payloads are supported only on a writable BLE connection.');
      }
      this.txInFlight = true;
      try {
        const bytes = this.textEncoder.encode(payload);
        for (let offset = 0; offset < bytes.length; offset += BLE_CHUNK_SIZE) {
          await this.writeBleSlice(this.rxChar, bytes.slice(offset, offset + BLE_CHUNK_SIZE));
          if (offset + BLE_CHUNK_SIZE < bytes.length) await sleep(INTER_CHUNK_DELAY_MS);
        }
        this.emitLog('tx', `BLE raw payload: ${payload}`);
      } finally {
        this.txInFlight = false;
      }
    });
    this.txQueue = next.catch(() => undefined);
    return next;
  }

  public async sendBlePayloadAndWaitAck(
    payload: string,
    matcher: (line: string) => boolean,
    timeoutMs: number = 12000,
  ): Promise<{ line: string; rttMs: number }> {
    const start = performance.now();
    const waitPromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ackWaiters = this.ackWaiters.filter((w) => w.timer !== timer);
        reject(new Error(`Timed out waiting for ESP32 response to BLE payload "${payload}" (${timeoutMs}ms)`));
      }, timeoutMs);
      this.ackWaiters.push({ matcher, resolve, reject, timer });
    });
    try {
      await this.sendBlePayload(payload);
    } catch (err) {
      this.rejectAllWaiters(err instanceof Error ? err.message : 'BLE write failed');
      throw err;
    }
    const line = await waitPromise;
    return { line, rttMs: Math.round(performance.now() - start) };
  }

  public async sendAndWaitAck(
    command: string,
    matcher: (line: string) => boolean,
    timeoutMs: number = COMMAND_TIMEOUT_MS,
  ): Promise<{ line: string; rttMs: number }> {
    const start = performance.now();

    const waitPromise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ackWaiters = this.ackWaiters.filter((w) => w.timer !== timer);
        reject(new Error(`Timed out waiting for device response to "${command.trim()}" (${timeoutMs}ms)`));
      }, timeoutMs);

      this.ackWaiters.push({ matcher, resolve, reject, timer });
    });

    try {
      await this.sendCommand(command);
    } catch (err) {
      this.rejectAllWaiters(err instanceof Error ? err.message : 'Write failed');
      throw err;
    }

    const line = await waitPromise;
    return { line, rttMs: Math.round(performance.now() - start) };
  }
}

export const hardwareTransport = new HardwareTransportManager();
