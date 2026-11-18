import React, { useState } from 'react';
import {
  ArrowDownCircle,
  Clock,
  Scale,
  RotateCcw,
  TimerReset,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import type {
  DishSensorState,
  TodayDoseItem,
  TransportKind,
} from '../types/dispenser';
import {
  formatIsoTimeInZone,
  formatScheduleTime,
  type TimezoneClockSnapshot,
} from '../utils/timezone';

interface TodayAtAGlanceProps {
  todayDoses: TodayDoseItem[];
  dishSensor: DishSensorState;
  dishRefreshMs: number;
  onChangeDishRefreshMs: (ms: number) => void;
  transport: TransportKind;
  pendingDropSlot: number | null;
  clockSnapshot: TimezoneClockSnapshot;
  use24Hour: boolean;
  onDropDose: (slot: number, originalTime: string) => Promise<void>;
  onDelayDose: (slot: number, originalTime: string, minutes: number) => Promise<void>;
  onCancelDelay: (slot: number, originalTime: string) => void;
  onReadDish: () => Promise<void>;
  onTareDish: () => Promise<void>;
  lowStockCount: number;
  queuedForTomorrowCount: number;
}

const REFRESH_OPTIONS = [
  { ms: 1000, label: '1s' },
  { ms: 2000, label: '2s' },
  { ms: 5000, label: '5s' },
  { ms: 0, label: 'Manual' },
];

export const TodayAtAGlance: React.FC<TodayAtAGlanceProps> = ({
  todayDoses,
  dishSensor,
  dishRefreshMs,
  onChangeDishRefreshMs,
  transport,
  pendingDropSlot,
  clockSnapshot,
  use24Hour,
  onDropDose,
  onDelayDose,
  onCancelDelay,
  onReadDish,
  onTareDish,
  lowStockCount,
  queuedForTomorrowCount,
}) => {
  const [customDelayKey, setCustomDelayKey] = useState<string | null>(null);
  const [customMinutes, setCustomMinutes] = useState<number>(20);

  const isConnected = transport !== 'disconnected';

  const dispensedToday = todayDoses.filter((d) => d.state === 'dispensed').length;
  const dueOrUpcoming = todayDoses.filter(
    (d) => d.state === 'due' || d.state === 'upcoming' || d.state === 'delayed',
  ).length;
  const delayedCount = todayDoses.filter((d) => d.delayMinutes > 0).length;
  const missedToday = todayDoses.filter((d) => d.state === 'missed').length;

  const formatDelta = (mins: number): string => {
    if (mins === 0) return 'Due now';
    if (mins < 0) {
      const abs = Math.abs(mins);
      return abs >= 60 ? `${Math.floor(abs / 60)}h ${abs % 60}m ago` : `${abs}m ago`;
    }
    return mins >= 60 ? `In ${Math.floor(mins / 60)}h ${mins % 60}m` : `In ${mins}m`;
  };

  const renderDishBadge = () => {
    if (!isConnected && dishSensor.weightGrams === null) {
      return (
        <span className="text-xs font-semibold text-slate-500">
          Connect ESP32 to read HX711 load cell
        </span>
      );
    }
    switch (dishSensor.status) {
      case 'pill_detected':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Pill(s) Detected in Dish</span>
          </span>
        );
      case 'awaiting_drop':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Awaiting Dish Confirmation</span>
          </span>
        );
      case 'empty':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Dish Empty (Picked Up / Clear)</span>
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold text-slate-500">
            Connected — waiting for HX711 reading
          </span>
        );
    }
  };

  return (
    <section className="space-y-6" aria-label="Today at a glance and dish weight sensor">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Today at a Glance Timeline */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                Today at a Glance
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {clockSnapshot.dateLabel} · {clockSnapshot.ianaTimezone} ({clockSnapshot.shortZone})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 tabular-nums">
              <span>
                <strong className="text-slate-900">{dispensedToday}</strong>/{todayDoses.length} dispensed
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <strong className="text-slate-900">{dueOrUpcoming}</strong> upcoming
              </span>
              {delayedCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700">
                    <strong>{delayedCount}</strong> delayed
                  </span>
                </>
              )}
              {missedToday > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-red-700">
                    <strong>{missedToday}</strong> missed
                  </span>
                </>
              )}
              {lowStockCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700">
                    <strong>{lowStockCount}</strong> low/empty stock
                  </span>
                </>
              )}
            </div>
          </div>

          {todayDoses.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">
                No scheduled doses due today — zero overdue notices.
              </p>
              <p className="text-xs text-slate-500">
                {queuedForTomorrowCount > 0
                  ? `${queuedForTomorrowCount} saved compartment schedule${queuedForTomorrowCount === 1 ? '' : 's'} will begin tomorrow. You can still drop any compartment manually below.`
                  : 'Enable a compartment or add dispense times below. Newly saved schedules begin the next day.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {todayDoses.map((item) => {
                const isDropping = pendingDropSlot === item.slot;
                const isCustomOpen = customDelayKey === item.key;

                return (
                  <div
                    key={item.key}
                    className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="font-mono tabular-nums text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 shrink-0">
                        {formatScheduleTime(item.effectiveTime, use24Hour)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {item.medicationName}
                          </span>
                          <span className="text-xs text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-semibold text-slate-700 tabular-nums">
                            {item.dosagePills} {item.dosagePills === 1 ? 'pill' : 'pills'} (display target)
                          </span>
                          <span className="text-xs text-slate-400" aria-hidden="true">
                            ·
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            Slot {item.slot}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                          {item.state === 'dispensed' && (
                            <span className="text-emerald-700 font-semibold">Dispensed today</span>
                          )}
                          {item.state === 'due' && (
                            <span className="text-sky-700 font-semibold">Due now</span>
                          )}
                          {item.state === 'upcoming' && (
                            <span className="text-slate-500 tabular-nums">
                              {formatDelta(item.minutesDelta)}
                            </span>
                          )}
                          {item.state === 'missed' && (
                            <span className="text-red-700 font-semibold tabular-nums">
                              Overdue ({formatDelta(item.minutesDelta)})
                            </span>
                          )}
                          {item.delayMinutes > 0 && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-amber-700 font-medium tabular-nums">
                                Delayed +{item.delayMinutes}m from{' '}
                                {formatScheduleTime(item.originalTime, use24Hour)}
                              </span>
                            </>
                          )}
                          {(item.stockLevel === 'low' || item.stockLevel === 'empty') && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-amber-700 font-semibold inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                Stock: {item.stockLevel === 'empty' ? 'Empty' : 'Low'}
                              </span>
                            </>
                          )}
                        </div>

                        {isCustomOpen && (
                          <div className="mt-2 flex items-center gap-2">
                            <input
                              type="number"
                              min={5}
                              max={360}
                              value={customMinutes}
                              onChange={(e) => setCustomMinutes(Math.max(5, Number(e.target.value)))}
                              className="w-20 h-7 px-2 text-xs font-mono border border-slate-300 rounded-md"
                            />
                            <span className="text-xs text-slate-500">min</span>
                            <button
                              type="button"
                              onClick={() => {
                                void onDelayDose(item.slot, item.originalTime, customMinutes);
                                setCustomDelayKey(null);
                              }}
                              className="px-2.5 h-7 text-xs font-semibold text-white bg-slate-900 rounded-md cursor-pointer"
                            >
                              Apply
                            </button>
                            <button
                              type="button"
                              onClick={() => setCustomDelayKey(null)}
                              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                              aria-label="Cancel custom delay"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.state !== 'dispensed' && (
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => void onDelayDose(item.slot, item.originalTime, 15)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          +15m
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDelayDose(item.slot, item.originalTime, 30)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          +30m
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomDelayKey(isCustomOpen ? null : item.key)
                          }
                          title="Custom delay duration"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer whitespace-nowrap"
                        >
                          <TimerReset className="w-3 h-3" aria-hidden="true" />
                          <span>Delay</span>
                        </button>
                        {item.delayMinutes > 0 && (
                          <button
                            type="button"
                            onClick={() => onCancelDelay(item.slot, item.originalTime)}
                            className="px-2 py-1.5 text-xs font-medium text-amber-800 hover:text-amber-950 cursor-pointer whitespace-nowrap"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void onDropDose(item.slot, item.originalTime)}
                          disabled={!isConnected || pendingDropSlot !== null || item.stockLevel === 'empty'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-md disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                        >
                          <ArrowDownCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isDropping ? 'Dropping...' : 'Drop'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Dish Weight Sensor */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Dish Weight Sensor
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  HX711 load cell pill verification
                </p>
              </div>
              <Scale className="w-5 h-5 text-slate-400 shrink-0" aria-hidden="true" />
            </div>

            <div className="py-4 border-y border-slate-100">
              <div className="font-mono tabular-nums text-3xl font-semibold text-slate-900">
                {dishSensor.weightGrams !== null
                  ? `${dishSensor.weightGrams.toFixed(2)} g`
                  : '— g'}
              </div>
              <div className="mt-2">{renderDishBadge()}</div>
              {dishSensor.lastUpdatedAt && (
                <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
                  Last reading:{' '}
                  {formatIsoTimeInZone(
                    dishSensor.lastUpdatedAt,
                    clockSnapshot.ianaTimezone,
                    use24Hour,
                  )}
                </p>
              )}
            </div>

            {/* Refresh frequency control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">HX711 Refresh Rate</span>
                <span className="text-slate-500">
                  {dishRefreshMs === 0 ? 'Push / Manual' : `Every ${dishRefreshMs / 1000}s`}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {REFRESH_OPTIONS.map((opt) => (
                  <button
                    key={opt.ms}
                    type="button"
                    onClick={() => onChangeDishRefreshMs(opt.ms)}
                    className={`py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                      dishRefreshMs === opt.ms
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void onReadDish()}
              disabled={!isConnected}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Read Now</span>
            </button>
            <button
              type="button"
              onClick={() => void onTareDish()}
              disabled={!isConnected || transport !== 'serial'}
              title={transport === 'ble' ? 'Tare is supported over USB Serial only' : undefined}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tare Scale</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
