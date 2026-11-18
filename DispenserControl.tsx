import React, { useState } from 'react';
import {
  ArrowDownCircle,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type {
  CompartmentSlot,
  DoseDelay,
  StockLevel,
  TransportKind,
} from '../types/dispenser';
import {
  addDaysToDateKey,
  formatIsoTimeInZone,
  formatScheduleTime,
  getMinutesUntilSchedule,
  type TimezoneClockSnapshot,
} from '../utils/timezone';

interface DispenserControlProps {
  slots: CompartmentSlot[];
  delays: DoseDelay[];
  transport: TransportKind;
  pendingDropSlot: number | null;
  clockSnapshot: TimezoneClockSnapshot;
  use24Hour: boolean;
  onDropPill: (slotNumber: number) => Promise<void>;
  onUpdateSlot: (updated: CompartmentSlot) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STOCK_OPTIONS: Array<{ id: StockLevel; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'full', label: 'Full' },
];

export const DispenserControl: React.FC<DispenserControlProps> = ({
  slots,
  delays,
  transport,
  pendingDropSlot,
  clockSnapshot,
  use24Hour,
  onDropPill,
  onUpdateSlot,
}) => {
  const [editingSlot, setEditingSlot] = useState<CompartmentSlot | null>(null);
  const [newTimeInput, setNewTimeInput] = useState('12:00');
  const isConnected = transport !== 'disconnected';

  const getNextScheduleMinutes = (times: string[]): number => {
    if (times.length === 0) return 0;
    return Math.min(...times.map((t) => getMinutesUntilSchedule(t, clockSnapshot)));
  };

  const formatCountdown = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0 && m === 0) return 'Due now';
    if (h === 0) return `In ${m}m`;
    return `In ${h}h ${m}m`;
  };

  const tomorrowDateKey = addDaysToDateKey(clockSnapshot.dateKey, 1);

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlot) return;
    const sortedTimes = [...new Set(editingSlot.dispenseTimes)].sort();
    onUpdateSlot({
      ...editingSlot,
      dispenseTimes: sortedTimes.length > 0 ? sortedTimes : ['08:00'],
      dosagePills: Math.max(1, editingSlot.dosagePills),
      startDateKey: tomorrowDateKey,
      courseDays: Math.min(365, Math.max(1, Number(editingSlot.courseDays) || 365)),
    });
    setEditingSlot(null);
  };

  const handleAddTimeInModal = () => {
    if (!editingSlot || !newTimeInput) return;
    if (editingSlot.dispenseTimes.includes(newTimeInput) || editingSlot.dispenseTimes.length >= 8) return;
    setEditingSlot({
      ...editingSlot,
      dispenseTimes: [...editingSlot.dispenseTimes, newTimeInput].sort(),
    });
  };

  const handleRemoveTimeInModal = (timeToRemove: string) => {
    if (!editingSlot || editingSlot.dispenseTimes.length <= 1) return;
    setEditingSlot({
      ...editingSlot,
      dispenseTimes: editingSlot.dispenseTimes.filter((t) => t !== timeToRemove),
    });
  };

  return (
    <section className="space-y-4" aria-label="Four-servo medicine dispenser">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              4-Servo Dispenser Control
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              One servo cycle per dispense · Up to 8 daily times per servo · Evaluated in {clockSnapshot.ianaTimezone} ({clockSnapshot.shortZone})
            </p>
          </div>


        </div>

        {!isConnected && (
          <div className="px-6 py-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
            <span>
              Hardware disconnected. Connect the ESP32 using Chrome Bluetooth LE or USB Serial at 115200 baud.
            </span>
          </div>
        )}

        <div className="divide-y divide-slate-100">
          {slots.map((slot) => {
            const isDropping = pendingDropSlot === slot.slot;
            const isBusy = pendingDropSlot !== null;
            const nextMins = getNextScheduleMinutes(slot.dispenseTimes);
            const activeDaysCount = slot.days.filter(Boolean).length;
            const slotDelays = delays.filter(
              (d) => d.slot === slot.slot && d.dateKey === clockSnapshot.dateKey,
            );

            return (
              <div
                key={slot.slot}
                className="px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-semibold text-sm text-slate-800 shrink-0 tabular-nums">
                    S{slot.slot}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {slot.medicationName}
                      </h3>
                      <span className="text-xs text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs font-semibold text-slate-700 tabular-nums">
                        {slot.dosagePills} {slot.dosagePills === 1 ? 'pill' : 'pills'} per dose
                      </span>
                      {!slot.enabled && (
                        <>
                          <span className="text-xs text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-medium text-slate-500">Paused</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums font-medium text-slate-700">
                        {slot.dispenseTimes
                          .map((t) => formatScheduleTime(t, use24Hour))
                          .join(', ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        Next {formatCountdown(nextMins)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {activeDaysCount === 7
                          ? 'Every day'
                          : activeDaysCount === 0
                            ? 'Manual only'
                            : DAY_LABELS.filter((_, idx) => slot.days[idx]).join(', ')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>Course: {slot.courseDays ?? 365} days</span>
                      {slot.enabled && slot.startDateKey && slot.startDateKey > clockSnapshot.dateKey && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-sky-700 font-medium">
                            Starts {slot.startDateKey === tomorrowDateKey ? 'tomorrow' : slot.startDateKey}
                          </span>
                        </>
                      )}
                      {slotDelays.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-amber-700 font-semibold">
                            Delayed ({slotDelays.map((d) => `${formatScheduleTime(d.delayedToTime, use24Hour)}`).join(', ')})
                          </span>
                        </>
                      )}
                    </div>

                    {slot.lastStatus === 'error' && slot.lastError && (
                      <p className="text-xs text-red-700 flex items-center gap-1.5 pt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{slot.lastError}</span>
                      </p>
                    )}

                    {slot.lastStatus === 'dispensed' && slot.lastDispensedAt && (
                      <p className="text-xs text-emerald-700 flex items-center gap-1.5 pt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>
                          Last dropped at{' '}
                          {formatIsoTimeInZone(
                            slot.lastDispensedAt,
                            clockSnapshot.ianaTimezone,
                            use24Hour,
                          )}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  {/* Stock level segmented control: Low / Medium / Full */}
                  <div
                    role="group"
                    aria-label={`Compartment ${slot.slot} stock level`}
                    className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg border border-slate-200"
                  >
                    {STOCK_OPTIONS.map((opt) => {
                      const active = slot.stockLevel === opt.id;
                      const activeClass =
                        opt.id === 'low'
                          ? 'bg-amber-600 text-white'
                          : opt.id === 'medium'
                            ? 'bg-sky-700 text-white'
                            : 'bg-emerald-700 text-white';
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onUpdateSlot({ ...slot, stockLevel: opt.id })}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                            active ? activeClass : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingSlot({
                        ...slot,
                        dispenseTimes: [...slot.dispenseTimes],
                        days: [...slot.days],
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void onDropPill(slot.slot)}
                    disabled={!isConnected || isBusy || slot.stockLevel === 'empty'}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {isDropping
                        ? 'Dropping...'
                        : 'Dispense'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Compartment Modal */}
      {editingSlot && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-slot-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 id="edit-slot-title" className="text-base font-bold text-slate-900">
                Edit Compartment S{editingSlot.slot}
              </h3>
              <button
                type="button"
                onClick={() => setEditingSlot(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  required
                  value={editingSlot.medicationName}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, medicationName: e.target.value })
                  }
                  className="w-full h-10 px-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Pill count (display only; one servo cycle per dispense)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    required
                    value={editingSlot.dosagePills}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        dosagePills: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Compartment Stock Level
                  </label>
                  <select
                    value={editingSlot.stockLevel}
                    onChange={(e) =>
                      setEditingSlot({
                        ...editingSlot,
                        stockLevel: e.target.value as StockLevel,
                      })
                    }
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                  >
                    <option value="full">Full</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="empty">Empty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course duration (days, 1–365)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  required
                  value={editingSlot.courseDays ?? 365}
                  onChange={(e) => setEditingSlot({
                    ...editingSlot,
                    courseDays: Math.min(365, Math.max(1, Number(e.target.value) || 1)),
                  })}
                  className="w-full h-10 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              {/* Multiple dispense times per day */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Daily Dispense Times ({clockSnapshot.shortZone})
                </label>
                <div className="space-y-2">
                  {editingSlot.dispenseTimes.map((time, index) => (
                    <div key={`${time}-${index}`} className="flex items-center gap-2">
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) => {
                          const next = [...editingSlot.dispenseTimes];
                          next[index] = e.target.value;
                          setEditingSlot({ ...editingSlot, dispenseTimes: next });
                        }}
                        className="flex-1 h-9 px-3 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeInModal(time)}
                        disabled={editingSlot.dispenseTimes.length <= 1}
                        className="p-2 text-slate-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        aria-label={`Remove time ${time}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="time"
                    value={newTimeInput}
                    onChange={(e) => setNewTimeInput(e.target.value)}
                    className="h-9 px-3 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddTimeInModal}
                    disabled={editingSlot.dispenseTimes.length >= 8}
                    className="inline-flex items-center gap-1.5 px-3 h-9 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Add Dispense Time</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Active Days
                </span>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAY_LABELS.map((day, idx) => {
                    const active = editingSlot.days[idx];
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const nextDays = [...editingSlot.days];
                          nextDays[idx] = !nextDays[idx];
                          setEditingSlot({ ...editingSlot, days: nextDays });
                        }}
                        className={`h-9 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'bg-sky-700 text-white border-sky-700'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingSlot.enabled}
                  onChange={(e) =>
                    setEditingSlot({ ...editingSlot, enabled: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-sky-700"
                />
                <span>Enable automatic schedule trigger in {clockSnapshot.ianaTimezone}</span>
              </label>

              <p className="text-xs text-slate-500">
                Schedules saved today begin tomorrow ({tomorrowDateKey}). Daily plans must be synchronized over USB Serial; until then, the ESP32 keeps its previous saved plan. Weekday-specific schedules are app-managed and require USB Serial, a successful Sync 4 Plans, and this page to remain open.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
