'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  XCircle,
  X,
  Sparkles,
} from 'lucide-react';
import { Participant } from '@/types';
import {
  THAI_DAYS_SHORT,
  THAI_MONTHS_FULL,
  formatThaiDate,
  isWeekend,
  computeDateSummaries,
} from '@/lib/utils';

interface HeatmapCalendarProps {
  participants: Participant[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

export default function HeatmapCalendar({
  participants,
  selectedDate,
  onSelectDate,
}: HeatmapCalendarProps) {
  const [currentDateView, setCurrentDateView] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = currentDateView.getFullYear();
  const month = currentDateView.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const totalFriends = participants.length;
  const summaries = computeDateSummaries(participants);

  // Map date -> summary for fast lookup
  const dateSummaryMap = new Map(summaries.map(s => [s.date, s]));

  const handlePrevMonth = () => {
    setCurrentDateView(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDateView(new Date(year, month + 1, 1));
  };

  // Intensity color calculator based on attendance %
  const getIntensityStyle = (count: number) => {
    if (totalFriends === 0 || count === 0) {
      return {
        bg: 'bg-slate-900/40 border-slate-800 text-slate-400',
        badge: null,
      };
    }

    const pct = count / totalFriends;
    if (pct >= 0.8) {
      return {
        bg: 'bg-emerald-600/40 border-emerald-400 text-emerald-100 shadow-md shadow-emerald-500/20 font-bold',
        badge: '🔥 คนเกือบครบ',
      };
    }
    if (pct >= 0.5) {
      return {
        bg: 'bg-teal-700/35 border-teal-400/80 text-teal-100 font-semibold',
        badge: '👍 เกินครึ่งแก๊ง',
      };
    }
    if (pct >= 0.25) {
      return {
        bg: 'bg-cyan-900/30 border-cyan-500/50 text-cyan-200',
        badge: null,
      };
    }
    return {
      bg: 'bg-slate-900/80 border-slate-700 text-slate-300',
      badge: null,
    };
  };

  // Details for currently selected date modal
  const selectedSummary = selectedDate ? dateSummaryMap.get(selectedDate) : null;
  const selectedAvailableFriends = selectedSummary ? selectedSummary.availableParticipants : [];
  const selectedMissingFriends = selectedDate
    ? participants.filter(p => !selectedAvailableFriends.some(ap => ap.id === p.id))
    : [];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>ปฏิทินความหนาแน่นวันว่าง</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                Heatmap
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              ยิ่งสีเขียวเข้ม = เพื่อนว่างตรงกันเยอะมาก แตะที่วันเพื่อดูรายชื่อเพื่อน
            </p>
          </div>
        </div>

        {/* Legend indicator */}
        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
          <span>คนว่างน้อย</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
            <div className="w-3 h-3 rounded bg-cyan-900/50 border border-cyan-600/50" />
            <div className="w-3 h-3 rounded bg-teal-700/50 border border-teal-500" />
            <div className="w-3 h-3 rounded bg-emerald-500 border border-emerald-300" />
          </div>
          <span className="text-emerald-400 font-medium">ว่างเกือบครบ</span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
            {THAI_MONTHS_FULL[month]} {year + 543}
          </h3>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-400 mb-2">
          {THAI_DAYS_SHORT.map((day, idx) => (
            <div
              key={day}
              className={`py-1 ${
                idx === 0 || idx === 6 ? 'text-amber-400 font-bold' : idx === 5 ? 'text-cyan-400' : ''
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Heatmap Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`blank-${i}`} className="h-14 sm:h-16" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNumber = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
            const summary = dateSummaryMap.get(dateStr);
            const count = summary ? summary.count : 0;
            const intensity = getIntensityStyle(count);
            const isSelected = selectedDate === dateStr;
            const weekend = isWeekend(dateStr);

            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectDate(isSelected ? null : dateStr)}
                className={`h-14 sm:h-16 rounded-xl flex flex-col items-center justify-between p-1.5 sm:p-2 border transition-all duration-200 select-none relative group hover:scale-[1.03] ${intensity.bg} ${
                  isSelected ? 'ring-2 ring-cyan-400 border-cyan-300 scale-[1.03]' : ''
                }`}
              >
                {/* Day number & weekend dot */}
                <div className="w-full flex items-center justify-between">
                  <span className={`text-xs sm:text-sm font-semibold ${weekend ? 'text-amber-300' : ''}`}>
                    {dayNumber}
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.2 rounded-md bg-slate-950/80 text-emerald-300 border border-emerald-500/40">
                      {count}
                    </span>
                  )}
                </div>

                {/* Sub label */}
                <div className="w-full text-center">
                  {count > 0 ? (
                    <span className="text-[9px] sm:text-[10px] text-emerald-300 leading-none truncate block">
                      {count}/{totalFriends} ว่าง
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-500 leading-none">
                      -
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Detail Modal / Drawer if a date is selected */}
      {selectedDate && (
        <div className="mt-5 p-5 bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="text-xs text-cyan-400 font-semibold uppercase tracking-wider">
                รายละเอียดวันว่าง
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mt-0.5">
                <span>📅 {formatThaiDate(selectedDate, 'full')}</span>
                {isWeekend(selectedDate) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                    สุดสัปดาห์
                  </span>
                )}
              </h4>
            </div>
            <button
              onClick={() => onSelectDate(null)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Friends who ARE available */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>เพื่อนที่ว่างในวันนี้ ({selectedAvailableFriends.length} คน):</span>
              </div>
              {selectedAvailableFriends.length > 0 ? (
                <div className="space-y-1.5">
                  {selectedAvailableFriends.map(p => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-slate-400 ml-2">({p.partyRole})</span>
                      </div>
                      {p.favoriteDrink && (
                        <span className="text-amber-300 text-[11px] truncate max-w-[140px]">
                          🍺 {p.favoriteDrink}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-900 rounded-xl text-center text-xs text-slate-500">
                  ยังไม่มีใครว่างในวันนี้
                </div>
              )}
            </div>

            {/* Friends who are NOT available */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-pink-300 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-pink-400" />
                <span>เพื่อนที่ยังไม่ว่าง ({selectedMissingFriends.length} คน):</span>
              </div>
              {selectedMissingFriends.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900/60 rounded-xl border border-slate-800">
                  {selectedMissingFriends.map(p => (
                    <span
                      key={p.id}
                      className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>สุดยอด! เพื่อนทุกคนว่างตรงกัน 100%!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
