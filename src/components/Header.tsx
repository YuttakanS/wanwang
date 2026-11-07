'use client';

import React from 'react';
import { Sparkles, Users, CalendarDays, Beer, Share2 } from 'lucide-react';
import { Participant } from '@/types';
import { computeDateSummaries, formatThaiDate } from '@/lib/utils';

interface HeaderProps {
  participants: Participant[];
  onScrollToForm: () => void;
  onScrollToSummary: () => void;
  onScrollToRoster: () => void;
}

export default function Header({
  participants,
  onScrollToForm,
  onScrollToSummary,
  onScrollToRoster,
}: HeaderProps) {
  const summaries = computeDateSummaries(participants);
  const bestDate = summaries.length > 0 ? summaries[0] : null;

  return (
    <header className="relative overflow-hidden bg-gradient-to-br from-cyan-950 via-slate-900 to-sky-950 text-white pb-10 pt-8 px-4 sm:px-6 shadow-2xl border-b border-cyan-800/40">
      {/* Decorative background glow circles */}
      <div className="absolute -top-24 -left-20 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-20 w-80 h-80 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Floating badge */}
        <div className="flex justify-center mb-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 backdrop-blur-md text-cyan-200 text-xs sm:text-sm font-medium shadow-inner animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>โหวตวันว่างด่วน! ก่อนคิวทริปจะเต็ม 🏊‍♂️</span>
          </div>
        </div>

        {/* Main Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-cyan-200 to-pink-300 bg-clip-text text-transparent drop-shadow-sm">
            🍻 วันว่าง 🌴
          </h1>
          <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-normal leading-relaxed">
            เลือกวันว่างของมึงมาเลยเพื่อน! เดี๋ยวระบบหาให้ว่าวันไหนคนว่างตรงกันเยอะสุด
            <br className="hidden sm:inline" />
            <span className="text-amber-300 font-medium"> #เมาไม่ขับหลับที่ขอบสระ #เพื่อนไม่ครบไม่เปิดตี้</span>
          </p>
        </div>

        {/* Quick Action Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mt-6">
          <button
            onClick={onScrollToForm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <span>✍️</span> ลงวันว่างของฉัน
          </button>
          <button
            onClick={onScrollToSummary}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-cyan-500/30 text-cyan-200 font-medium text-sm sm:text-base backdrop-blur-md transition-all hover:scale-105"
          >
            <CalendarDays className="w-4 h-4 text-cyan-400" />
            <span>ดูวันว่างที่ตรงกัน</span>
          </button>
          <button
            onClick={onScrollToRoster}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 font-medium text-sm sm:text-base backdrop-blur-md transition-all hover:scale-105"
          >
            <Users className="w-4 h-4 text-pink-400" />
            <span>รายชื่อเพื่อน ({participants.length})</span>
          </button>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-8">
          {/* Card 1: Total friends */}
          <div className="bg-slate-900/60 border border-cyan-500/20 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 text-center hover:border-cyan-500/40 transition-colors shadow-lg">
            <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-300">
              <Users className="w-5 h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white">
              {participants.length} <span className="text-xs sm:text-sm font-normal text-slate-400">คน</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">ลงวันว่างแล้ว</div>
          </div>

          {/* Card 2: Top Date */}
          <div className="bg-slate-900/60 border border-amber-500/30 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 text-center hover:border-amber-500/50 transition-colors shadow-lg">
            <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div className="text-base sm:text-lg font-bold text-amber-300 truncate">
              {bestDate ? formatThaiDate(bestDate.date, 'weekday') : 'รอกดโหวต'}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {bestDate ? `👑 ว่างตรงกัน ${bestDate.count} คน` : 'ยังไม่มีวันโหวต'}
            </div>
          </div>

          {/* Card 3: Party Vibe */}
          <div className="col-span-2 sm:col-span-1 bg-slate-900/60 border border-pink-500/20 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 text-center hover:border-pink-500/40 transition-colors shadow-lg">
            <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300">
              <Beer className="w-5 h-5" />
            </div>
            <div className="text-base sm:text-lg font-bold text-pink-300">
              {participants.length >= 6 ? '🔥 เปิดตี้ได้เลย!' : '🍻 กำลังตามเพื่อน'}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {participants.length >= 6 ? 'คนเริ่มครบแก๊งแล้ว' : 'ส่งต่อให้เพื่อนลงเพิ่ม'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
