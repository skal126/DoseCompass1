import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Search,
  AlertCircle,
  XCircle,
  Check,
} from 'lucide-react';
import type { AdherenceLogEntry, CompartmentSlot } from '../types/dispenser';
import { formatScheduleTime, type TimezoneClockSnapshot } from '../utils/timezone';

interface CaregiverDashboardProps {
  logs: AdherenceLogEntry[];
  slots: CompartmentSlot[];
  clockSnapshot: TimezoneClockSnapshot;
  use24Hour: boolean;
  onMarkStatus: (entryId: string, status: 'taken' | 'missed') => void;
  onClearAdherenceLogs: () => void;
}

type LogFilter = 'all' | 'dispensed' | 'taken' | 'missed' | 'error';

export const CaregiverDashboard: React.FC<CaregiverDashboardProps> = ({
  logs,
  slots,
  clockSnapshot,
  use24Hour,
  onMarkStatus,
  onClearAdherenceLogs,
}) => {
  const [filter, setFilter] = useState<LogFilter>('all');
  const [query, setQuery] = useState('');

  const summary = useMemo(() => {
    const activeSlots = slots.filter((s) => s.enabled).length;
    const dispensedCount = logs.filter(
      (l) => l.status === 'dispensed' || l.status === 'taken',
    ).length;
    const missedCount = logs.filter((l) => l.status === 'missed').length;
    const errorCount = logs.filter((l) => l.status === 'error').length;
    const lowStockCount = slots.filter(
      (s) => s.stockLevel === 'low' || s.stockLevel === 'empty',
    ).length;
    return { activeSlots, dispensedCount, missedCount, errorCount, lowStockCount };
  }, [logs, slots]);

  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (filter !== 'all' && entry.status !== filter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        return (
          entry.medicationName.toLowerCase().includes(q) ||
          `s${entry.slot}`.includes(q) ||
          entry.source.toLowerCase().includes(q) ||
          (entry.note ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filter, query]);

  const handleExportCsv = () => {
    const header = [
      'Timestamp',
      'Timezone',
      'Slot',
      'Medication',
      'Dosage (Pills)',
      'Scheduled',
      'Source',
      'Status',
      'Note',
    ];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.timezone,
      `S${l.slot}`,
      `"${l.medicationName.replace(/"/g, '""')}"`,
      `${l.dosagePills} ${l.dosagePills === 1 ? 'pill' : 'pills'}`,
      l.scheduledTime,
      l.source,
      l.status,
      `"${(l.note ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dosecompass-adherence-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderStatus = (status: AdherenceLogEntry['status']) => {
    switch (status) {
      case 'dispensed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Hardware Dispensed</span>
          </span>
        );
      case 'taken':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Confirmed Taken</span>
          </span>
        );
      case 'missed':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Missed</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Hardware Error</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Clock className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <section className="space-y-6" aria-label="Caregiver adherence log">
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Active Compartments</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {summary.activeSlots} / {slots.length}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Hardware Dispensed</p>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-1">
            {summary.dispensedCount}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Missed / Errors</p>
          <p className="text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {summary.missedCount + summary.errorCount}
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs font-medium text-slate-500">Low / Empty Stock</p>
          <p className="text-2xl font-bold text-amber-700 tabular-nums mt-1">
            {summary.lowStockCount}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Caregiver Adherence &amp; Hardware Event Log
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Timestamps displayed in {clockSnapshot.ianaTimezone} ({clockSnapshot.shortZone})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'dispensed', label: 'Dispensed' },
                  { id: 'taken', label: 'Taken' },
                  { id: 'missed', label: 'Missed' },
                  { id: 'error', label: 'Errors' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search
                className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter medication..."
                className="h-9 pl-8 pr-3 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>

            {logs.length > 0 && (
              <button
                type="button"
                onClick={onClearAdherenceLogs}
                className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear Log
              </button>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-slate-800">No adherence events recorded</p>
            <p className="text-xs text-slate-500 mt-1">
              Connect your ESP32 via Chrome Bluetooth, 115200 USB Serial, or MQTT and dispense a dose to log real hardware events here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-6">Time ({clockSnapshot.shortZone})</th>
                  <th className="py-3 px-4">Slot</th>
                  <th className="py-3 px-4">Medication &amp; Pill Count</th>
                  <th className="py-3 px-4">Scheduled</th>
                  <th className="py-3 px-4">Transport</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Caregiver Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredLogs.map((entry) => {
                  const formattedTime = new Date(entry.timestamp).toLocaleString([], {
                    timeZone: clockSnapshot.ianaTimezone,
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: !use24Hour,
                  });

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 font-mono text-xs text-slate-700 tabular-nums whitespace-nowrap">
                        {formattedTime}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 tabular-nums">
                        S{entry.slot}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 text-xs">
                          {entry.medicationName}
                        </div>
                        <div className="text-xs text-slate-500 tabular-nums">
                          {entry.dosagePills} {entry.dosagePills === 1 ? 'pill' : 'pills'}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {formatScheduleTime(entry.scheduledTime, use24Hour)}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 uppercase font-mono">
                        {entry.source}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{renderStatus(entry.status)}</td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        {entry.status === 'dispensed' && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onMarkStatus(entry.id, 'taken')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md cursor-pointer"
                            >
                              <Check className="w-3 h-3" aria-hidden="true" />
                              <span>Confirm Taken</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onMarkStatus(entry.id, 'missed')}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer"
                            >
                              Mark Missed
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
