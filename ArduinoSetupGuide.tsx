import React, { useState } from 'react';
import { Check, Copy, Cpu, AlertTriangle } from 'lucide-react';
import { ARDUINO_SKETCHES } from '../data/arduinoFirmware';

export const ArduinoSetupGuide: React.FC = () => {
  const [selectedId, setSelectedId] = useState(ARDUINO_SKETCHES[0].id);
  const [copied, setCopied] = useState(false);

  const activeSketch =
    ARDUINO_SKETCHES.find((s) => s.id === selectedId) ?? ARDUINO_SKETCHES[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeSketch.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <section className="space-y-6" aria-label="ESP32 firmware and Chrome Bluetooth guide">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              ESP32 Chrome Web Bluetooth &amp; Pill-Drop Connection Checklist
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Why ESP32 sketches fail to connect in Chrome and how the firmware below fixes it
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100 text-sm">
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900">1. Open outside embedded iframe</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Chrome disables <code className="font-mono bg-slate-100 px-1 rounded">navigator.bluetooth</code> inside sandboxed iframes unless the app is opened in its own browser tab. If Bluetooth throws a Permissions-Policy error, click <strong>Open in New Tab</strong> or use <strong>MQTT</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900">2. Advertise Service UUID &amp; BLE2902</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your ESP32 sketch must include <code className="font-mono bg-slate-100 px-1 rounded">pTxChar-&gt;addDescriptor(new BLE2902())</code> and <code className="font-mono bg-slate-100 px-1 rounded">pAdvertising-&gt;addServiceUUID(SERVICE_UUID)</code>. Also disconnect any phone BLE app (like nRF Connect) before pairing in Chrome.
            </p>
          </div>

          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-900">3. Non-blocking pill drop &amp; 115200 Serial</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Avoid <code className="font-mono bg-slate-100 px-1 rounded">delay()</code> in BLE callbacks so the ESP32 never misses GATT keepalives. USB Serial runs at <code className="font-mono bg-slate-100 px-1 rounded">115200</code> baud—close the Arduino Serial Monitor before connecting from Chrome.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <h3 className="text-base font-bold text-slate-900">
              13-Compartment ESP32 Firmware Templates
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {ARDUINO_SKETCHES.map((sketch) => (
              <button
                key={sketch.id}
                type="button"
                onClick={() => setSelectedId(sketch.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedId === sketch.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sketch.boardTitle}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 text-xs text-slate-600">
            <p className="font-medium text-slate-800">{activeSketch.summary}</p>
            <div className="flex flex-wrap items-center gap-2 text-slate-500">
              <span>{activeSketch.transportSummary}</span>
              <span aria-hidden="true">·</span>
              <span>Serial: {activeSketch.baudRate} baud</span>
              <span aria-hidden="true">·</span>
              <span>Pins: {activeSketch.hardwarePins}</span>
              <span aria-hidden="true">·</span>
              <span>Libraries: {activeSketch.libraries.join(', ')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Copied Sketch</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copy Sketch</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-6 bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed">
          <code>{activeSketch.code}</code>
        </pre>
      </div>
    </section>
  );
};
