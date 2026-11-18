import React, { useState } from 'react';
import {
  Bluetooth,
  BluetoothOff,
  Clock,
  RefreshCw,
  Send,
  Terminal,
  Usb,
  AlertCircle,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import type {
  HardwareTelemetry,
  PacketLogEntry,
  TransportKind,
} from '../types/dispenser';
import { hardwareTransport, USB_SERIAL_BAUD_RATE } from '../services/hardwareTransport';
import { getAvailableTimezones, type TimezoneClockSnapshot } from '../utils/timezone';

type ConnectionModeTab = 'ble' | 'serial';

interface DeviceManagerProps {
  transport: TransportKind;
  telemetry: HardwareTelemetry;
  customBleServiceUuid: string;
  onChangeCustomBleServiceUuid: (uuid: string) => void;
  timezone: string;
  onChangeTimezone: (tz: string) => void;
  use24Hour: boolean;
  onToggle24Hour: () => void;
  autoSyncClock: boolean;
  onToggleAutoSyncClock: () => void;
  clockSnapshot: TimezoneClockSnapshot;
  packetLogs: PacketLogEntry[];
  onClearLogs: () => void;
  onConnectBle: () => Promise<void>;
  onConnectSerial: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onSyncClock: () => Promise<void>;
  onSyncPlans: () => Promise<void>;
  onPingDevice: () => Promise<void>;
  onSendRawCommand: (cmd: string) => Promise<void>;
  connectionError: string | null;
  isConnecting: boolean;
  isSyncingClock: boolean;
}

export const DeviceManager: React.FC<DeviceManagerProps> = ({
  transport,
  telemetry,
  customBleServiceUuid,
  onChangeCustomBleServiceUuid,
  timezone,
  onChangeTimezone,
  use24Hour,
  onToggle24Hour,
  autoSyncClock,
  onToggleAutoSyncClock,
  clockSnapshot,
  packetLogs,
  onClearLogs,
  onConnectBle,
  onConnectSerial,
  onDisconnect,
  onSyncClock,
  onSyncPlans,
  onPingDevice,
  onSendRawCommand,
  connectionError,
  isConnecting,
  isSyncingClock,
}) => {
  const [connMode, setConnMode] = useState<ConnectionModeTab>('ble');
  const [showCustomUuid, setShowCustomUuid] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [showConsole, setShowConsole] = useState(true);

  const timezones = getAvailableTimezones();
  const bleSupported = hardwareTransport.isWebBluetoothSupported();
  const serialSupported = hardwareTransport.isWebSerialSupported();
  const inIframe = hardwareTransport.isInsideIframe();
  const isConnected = transport !== 'disconnected';

  const handleRawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = rawInput.trim();
    if (!trimmed) return;
    setRawInput('');
    await onSendRawCommand(trimmed);
  };

  return (
    <section className="space-y-6" aria-label="Hardware connection and timezone clock">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Hardware Connection (BLE GATT / USB Serial) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Hardware Connection
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Chrome Web Bluetooth (ESP32 GATT) or USB Serial at 115200 baud
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium">
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span>
                      {transport === 'ble'
                        ? 'Bluetooth Connected'
                        : transport === 'serial'
                          ? 'USB Serial Connected'
                          : 'Connected'}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <BluetoothOff className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Disconnected</span>
                  </span>
                )}
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setConnMode('ble')}
                disabled={isConnected}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  connMode === 'ble'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bluetooth className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Bluetooth LE (Chrome)</span>
              </button>
              <button
                type="button"
                onClick={() => setConnMode('serial')}
                disabled={isConnected}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed ${
                  connMode === 'serial'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Usb className="w-3.5 h-3.5" aria-hidden="true" />
                <span>USB / BT Serial ({USB_SERIAL_BAUD_RATE})</span>
              </button>
            </div>

            {connectionError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-medium">Connection issue</p>
                  <p className="text-xs text-red-700 leading-relaxed">{connectionError}</p>
                </div>
              </div>
            )}

            {/* Mode-specific controls */}
            {connMode === 'ble' && (
              <div className="space-y-3 text-xs text-slate-600">
                <p>
                  For this ESP32 firmware, BLE provides live HX711 weight notifications and manual servo dispensing. The app sends a raw compartment index (0–3); clock, saved-plan and tare commands are available only over USB Serial.
                </p>
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-900">
                  If you change a daily schedule while using BLE or while disconnected, the ESP32 continues its previously saved plan. Connect by USB Serial and use <strong>Sync 4 Plans</strong> before relying on the new schedule.
                </p>

                {inIframe && (
                  <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    Note: If Chrome blocks the Bluetooth picker inside this embedded preview frame, click <strong>Open in New Tab</strong> (or use USB Serial).
                  </p>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => setShowCustomUuid((prev) => !prev)}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
                  >
                    {showCustomUuid ? 'Hide custom Service UUID(s)' : 'Device not connecting? Enter custom Service UUID(s)'}
                  </button>
                  {showCustomUuid && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customBleServiceUuid}
                        onChange={(e) => onChangeCustomBleServiceUuid(e.target.value)}
                        disabled={isConnected}
                        placeholder="Comma-separated 128-bit or 16-bit Service UUIDs (e.g. 4fafc201-..., ffe0)"
                        className="w-full h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {connMode === 'serial' && (
              <div className="text-xs text-slate-600 space-y-1.5">
                <p>
                  Connect the ESP32's USB data cable to the computer at <strong className="font-mono text-slate-900">{USB_SERIAL_BAUD_RATE} baud</strong>.
                </p>
                <p className="text-slate-500">
                  Close Arduino IDE Serial Monitor before connecting. USB Serial sets the ESP32 clock, synchronizes the four saved plans and allows load-cell tare.
                </p>
              </div>
            )}



            {/* Active link telemetry */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-slate-500">Device</p>
                <p className="font-semibold text-slate-900 mt-0.5 truncate">
                  {telemetry.deviceName ?? 'None'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Link</p>
                <p className="font-semibold text-slate-900 mt-0.5 truncate">
                  {telemetry.linkDetail ?? 'Standby'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Pipeline</p>
                <p className="font-mono text-slate-900 mt-0.5">
                  {telemetry.writeMode ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Last RTT</p>
                <p className="font-mono tabular-nums text-slate-900 mt-0.5">
                  {telemetry.lastRttMs !== null ? `${telemetry.lastRttMs} ms` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            {!isConnected ? (
              <>
                {connMode === 'ble' && (
                  <button
                    type="button"
                    onClick={() => void onConnectBle()}
                    disabled={!bleSupported || isConnecting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Bluetooth className="w-4 h-4" aria-hidden="true" />
                    <span>{isConnecting ? 'Pairing Bluetooth...' : 'Connect Bluetooth'}</span>
                  </button>
                )}

                {connMode === 'serial' && (
                  <button
                    type="button"
                    onClick={() => void onConnectSerial()}
                    disabled={!serialSupported || isConnecting}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Usb className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {isConnecting ? 'Opening Port...' : `Connect USB Serial (${USB_SERIAL_BAUD_RATE})`}
                    </span>
                  </button>
                )}


              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void onPingDevice()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Activity className="w-4 h-4" aria-hidden="true" />
                  <span>{transport === 'serial' ? 'Query ESP32' : 'BLE Link Info'}</span>
                </button>
                {transport === 'serial' && (
                  <button
                    type="button"
                    onClick={() => void onSyncPlans()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    <span>Sync 4 Plans</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void onDisconnect()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BluetoothOff className="w-4 h-4" aria-hidden="true" />
                  <span>Disconnect</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right: Timezone-Based Device Clock */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Device Clock
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Dashboard time; ESP32 clock is set over USB Serial
                </p>
              </div>
              <button
                type="button"
                onClick={onToggle24Hour}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {use24Hour ? '24h Format' : '12h Format'}
              </button>
            </div>

            <div className="py-4 border-y border-slate-100">
              <div className="font-mono tabular-nums text-3xl sm:text-4xl font-semibold text-slate-900 tracking-tight">
                {use24Hour ? clockSnapshot.time24 : clockSnapshot.time12}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{clockSnapshot.dateLabel}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{clockSnapshot.offsetLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{clockSnapshot.shortZone}</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="device-timezone-select"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Dispenser Timezone
              </label>
              <select
                id="device-timezone-select"
                value={timezone}
                onChange={(e) => onChangeTimezone(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:border-sky-600"
              >
                {timezones.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label} — {tz.id}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSyncClock}
                onChange={onToggleAutoSyncClock}
                disabled={transport === 'ble'}
                className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
              />
              <span>Automatically sync ESP32 clock when connected or timezone changes (USB Serial)</span>
            </label>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 min-w-0">
              {telemetry.lastClockSyncAt ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    Synced ({telemetry.lastClockSyncTz})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Not synced to ESP32 over USB Serial yet</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => void onSyncClock()}
              disabled={!isConnected || transport !== 'serial' || isSyncingClock}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isSyncingClock ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{isSyncingClock ? 'Syncing...' : 'Sync Clock'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hardware TX/RX Packet Monitor */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900">Hardware Packet Console</h3>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 tabular-nums">
              {packetLogs.length} events
            </span>
          </div>
          <div className="flex items-center gap-3">
            {packetLogs.length > 0 && (
              <button
                type="button"
                onClick={onClearLogs}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowConsole((prev) => !prev)}
              className="text-xs font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
            >
              {showConsole ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {showConsole && (
          <div>
            <div className="max-h-44 overflow-y-auto bg-slate-950 text-slate-200 p-4 font-mono text-xs space-y-1.5">
              {packetLogs.length === 0 ? (
                <p className="text-slate-500">
                  No hardware packets yet. Connect your ESP32 via Chrome Bluetooth or 115200 USB Serial to inspect TX/RX frames.
                </p>
              ) : (
                packetLogs.map((entry) => {
                  const dirColor =
                    entry.direction === 'tx'
                      ? 'text-sky-400'
                      : entry.direction === 'rx'
                        ? 'text-emerald-400'
                        : entry.direction === 'error'
                          ? 'text-red-400'
                          : 'text-slate-400';
                  return (
                    <div key={entry.id} className="flex items-start gap-3 leading-relaxed">
                      <span className="text-slate-500 tabular-nums shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour12: false,
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                      <span className={`uppercase font-semibold w-8 shrink-0 ${dirColor}`}>
                        {entry.direction}
                      </span>
                      <span className="break-all text-slate-100">{entry.message}</span>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={(e) => void handleRawSubmit(e)}
              className="flex items-center gap-2 p-3 bg-slate-50 border-t border-slate-200"
            >
              <input
                type="text"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                disabled={!isConnected || transport !== 'serial'}
                placeholder={
                  isConnected && transport === 'serial'
                    ? 'ESP32 commands: t, w, T <epoch>, P?, P <plan>, G <index>'
                    : isConnected
                      ? 'Raw commands are available over USB Serial only'
                    : 'Connect hardware to send raw commands'
                }
                className="flex-1 h-9 px-3 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <button
                type="submit"
                disabled={!isConnected || transport !== 'serial' || !rawInput.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 h-9 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
};
