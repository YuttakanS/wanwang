'use client';

import React from 'react';
import { Trophy, CalendarCheck, Users, AlertCircle, Sparkles } from 'lucide-react';
import { Participant } from '@/types';
import { computeDateSummaries, formatThaiDate } from '@/lib/utils';

interface BestDatesLeaderboardProps {
  participants: Participant[];
  onSelectDate: (date: string) => void;
}

export default function BestDatesLeaderboard({
  participants,
  onSelectDate,
}: BestDatesLeaderboardProps) {
  const summaries = computeDateSummaries(participants);
  const total = participants.length;

  if (total === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-slate-800/80 flex items-center justify-center text-3xl">
          🍻
        </div>
        <h3 className="text-lg font-bold text-slate-200">ยังไม่มีข้อมูลวันว่าง</h3>
        <p className="text-sm mt-1">ชวนเพื่อนๆ เข้ามากดลงวันว่างด้านล่างได้เลย!</p>
      </div>
    );
  }

  const topDates = summaries.slice(0, 3);
  const rankStyles = [
    {
      badge: '🥇 อันดับ 1 (มงลง)',
      border: 'border-amber-400/60 shadow-amber-500/10',
      bg: 'from-amber-950/40 via-slate-900/90 to-amber-950/20',
      textAccent: 'text-amber-300',
      barColor: 'from-amber-400 to-yellow-500',
      medalIcon: '👑',
    },
    {
      badge: '🥈 อันดับ 2',
      border: 'border-slate-300/40 shadow-slate-400/10',
      bg: 'from-slate-800/40 via-slate-900/90 to-slate-800/20',
      textAccent: 'text-slate-200',
      barColor: 'from-slate-300 to-slate-400',
      medalIcon: '🥈',
    },
    {
      badge: '🥉 อันดับ 3',
      border: 'border-orange-500/40 shadow-orange-500/10',
      bg: 'from-orange-950/30 via-slate-900/90 to-orange-950/10',
      textAccent: 'text-orange-300',
      barColor: 'from-orange-400 to-amber-600',
      medalIcon: '🥉',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>วันที่คนว่างตรงกันเยอะสุด</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Top Matches
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              วิเคราะห์จากเพื่อนที่ลงชื่อ {total} คน แนะนำให้ล็อคคิววันเหล่านี้เพื่อเปิดตี้
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {topDates.map((item, index) => {
          const style = rankStyles[index] || rankStyles[2];
          const pct = Math.round((item.count / total) * 100);
          const missingFriends = participants.filter(
            p => !item.availableParticipants.some(ap => ap.id === p.id)
          );

          return (
            <div
              key={item.date}
              onClick={() => onSelectDate(item.date)}
              className={`relative group cursor-pointer overflow-hidden rounded-2xl border ${style.border} bg-gradient-to-b ${style.bg} p-5 shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col justify-between`}
            >
              <div>
                {/* Header Badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-slate-950/70 border border-slate-700 ${style.textAccent} flex items-center gap-1`}>
                    <span>{style.medalIcon}</span>
                    <span>{style.badge}</span>
                  </span>

                  {item.isWeekend && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      🌴 สุดสัปดาห์
                    </span>
                  )}
                </div>

                {/* Date Display */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {item.dayOfWeekThai}
                  </div>
                  <div className="text-2xl font-extrabold text-white group-hover:text-cyan-300 transition-colors">
                    {formatThaiDate(item.date, 'weekday')}
                  </div>
                </div>

                {/* Attendance Counter & Progress Bar */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-300 font-medium">ความพร้อมของแก๊ง:</span>
                    <span className={`font-bold text-sm ${style.textAccent}`}>
                      {item.count} / {total} คน ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950/80 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${style.barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Available Friends Tag List */}
                <div className="space-y-1.5 mb-3">
                  <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>คนที่ว่าง ({item.availableParticipants.length}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {item.availableParticipants.map(p => (
                      <span
                        key={p.id}
                        className="text-xs px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200"
                        title={p.partyRole}
                      >
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Missing Friends notice */}
                {missingFriends.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="text-slate-500">ยังไม่ว่าง ({missingFriends.length}): </span>
                    <span className="text-slate-400">{missingFriends.map(p => p.name).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Action hint at bottom */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 group-hover:text-cyan-300 transition-colors">
                <span>คลิกเพื่อดูรายละเอียด</span>
                <span>👉</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
