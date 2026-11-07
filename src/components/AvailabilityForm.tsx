'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Beer,
  User,
  MessageSquare,
  Wine,
} from 'lucide-react';
import { Participant, PartyRole } from '@/types';
import {
  THAI_DAYS_SHORT,
  THAI_MONTHS_FULL,
  formatThaiDate,
  isWeekend,
  isFriday,
} from '@/lib/utils';

interface AvailabilityFormProps {
  onSuccess: (participant: Participant) => void;
  editingParticipant?: Participant | null;
  onCancelEdit?: () => void;
}

const PARTY_ROLES: { role: PartyRole; emoji: string; desc: string }[] = [
  { role: '[removed]', emoji: '🥃', desc: 'คอทองแดง ไม่หมดขวดไม่นอน' },
  { role: '[removed]', emoji: '🍹', desc: 'ชงเก่ง ผสมสูตรล้มตึง' },
  { role: '[removed]', emoji: '🥩', desc: 'เชฟประจำตี้ หน้าเตาไม่เคยว่าง' },
  { role: '[removed]', emoji: '📸', desc: 'ชุดบิกินี่ 3 เซ็ต รูปต้องปัง' },
  { role: 'สายเปิดเพลง/ยึดไมค์', emoji: '🎤', desc: 'ดีเจประจำทริป คาราโอเกะยันเช้า' },
  { role: '[removed]', emoji: '💤', desc: 'สตาร์ทแรง หลับเป็นคนแรก' },
  { role: 'สายชิลล์/แช่น้ำเป็ดเหลือง', emoji: '🐤', desc: 'ลอยตัวในสระ จิบเบียร์เพลินๆ' },
  { role: 'สายลากเพื่อนเข้าตี้', emoji: '🚀', desc: 'สายบิ้วท์ เพื่อนไม่มาโทรจิก' },
];

export default function AvailabilityForm({
  onSuccess,
  editingParticipant,
  onCancelEdit,
}: AvailabilityFormProps) {
  const [name, setName] = useState('');
  const [partyRole, setPartyRole] = useState<PartyRole>('[removed]');
  const [favoriteDrink, setFavoriteDrink] = useState('');
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Month navigation state
  const [currentDateView, setCurrentDateView] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    if (editingParticipant) {
      setName(editingParticipant.name || '');
      setPartyRole(editingParticipant.partyRole as PartyRole);
      setFavoriteDrink(editingParticipant.favoriteDrink || '');
      setSelectedDates(editingParticipant.availableDates || []);
      setNote(editingParticipant.note || '');
    }
  }, [editingParticipant]);

  const year = currentDateView.getFullYear();
  const month = currentDateView.getMonth();

  // Days in month calculation
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDateView(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDateView(new Date(year, month + 1, 1));
  };

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  // Quick preset: Select all Weekends in this month (Sat & Sun)
  const handleSelectWeekends = () => {
    const weekendDates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        weekendDates.push(dateStr);
      }
    }
    // Union with current selected
    const merged = Array.from(new Set([...selectedDates, ...weekendDates]));
    setSelectedDates(merged);
  };

  // Quick preset: Select all Fri, Sat, Sun in this month
  const handleSelectFriSatSun = () => {
    const dates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(dateStr);
      }
    }
    const merged = Array.from(new Set([...selectedDates, ...dates]));
    setSelectedDates(merged);
  };

  const handleClearSelection = () => {
    setSelectedDates([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณากรอกชื่อหรือชื่อเล่นของมึงก่อนเพื่อน!');
      return;
    }
    if (selectedDates.length === 0) {
      alert('กรุณาเลือกวันที่ว่างอย่างน้อย 1 วันนะเพื่อน!');
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);

    const payload: Partial<Participant> = {
      id: editingParticipant ? editingParticipant.id : undefined,
      name: name.trim(),
      partyRole,
      favoriteDrink: favoriteDrink.trim(),
      availableDates: selectedDates.sort(),
      note: note.trim(),
    };

    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.participant) {
        setSuccessMessage('🎉 บันทึกข้อมูลวันว่างเรียบร้อยแล้ว! เตรียมตัวเปิดตี้!');
        onSuccess(data.participant);
        if (!editingParticipant) {
          // Reset form if creating new
          setName('');
          setFavoriteDrink('');
          setSelectedDates([]);
          setNote('');
        }
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      {/* Decorative gradient corner */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-cyan-500/10 via-pink-500/5 to-transparent rounded-bl-full pointer-events-none" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>{editingParticipant ? '✏️ แก้ไขวันว่างของมึง' : '✍️ ลงวันว่างของฉัน'}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {editingParticipant
                ? `กำลังแก้ไขข้อมูลของ ${editingParticipant.name}`
                : 'กรอกชื่อ เลือกสไตล์ แล้วแตะเลือกวันที่ตัวเองว่างได้เลย!'}
            </p>
          </div>
        </div>

        {editingParticipant && onCancelEdit && (
          <button
            onClick={onCancelEdit}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
          >
            ยกเลิกการแก้ไข
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Friend's Name & Drink */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <User className="w-4 h-4 text-cyan-400" />
              <span>ชื่อเล่น / ชื่อมึง <span className="text-pink-400">*</span></span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="เช่น Member 4, Member 2, Member 3สายเบียร์"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-white placeholder-slate-500 text-sm outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              <Wine className="w-4 h-4 text-amber-400" />
              <span>เครื่องดื่ม / ของกินที่อยากพกไป (ถ้ามี)</span>
            </label>
            <input
              type="text"
              value={favoriteDrink}
              onChange={e => setFavoriteDrink(e.target.value)}
              placeholder="เช่น SangSom 2 กลม, ลังเบียร์, หมูกระทะ"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-sm outline-none transition-all"
            />
          </div>
        </div>

        {/* Step 2: Party Role Badges */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <Beer className="w-4 h-4 text-pink-400" />
            <span>ตำแหน่งหน้าที่ในทริปนี้ (เลือก 1 อย่าง):</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PARTY_ROLES.map(item => {
              const isSelected = partyRole === item.role;
              return (
                <button
                  type="button"
                  key={item.role}
                  onClick={() => setPartyRole(item.role)}
                  className={`p-2.5 sm:p-3 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-900/60 to-blue-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-500/20 scale-[1.02]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="text-xl sm:text-2xl mb-1">{item.emoji}</div>
                  <div className="font-semibold text-xs text-white leading-snug">{item.role}</div>
                  <div className="text-[10px] text-slate-400 mt-1 line-clamp-1">{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Calendar Date Picker */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-cyan-400" />
                <span>แตะเลือกวันที่ตัวเองว่าง <span className="text-pink-400">*</span></span>
              </label>
              <p className="text-xs text-slate-400 mt-0.5">
                กดเลือกได้หลายวัน (แถบสีส้มอ่อน = วันศุกร์/เสาร์/อาทิตย์)
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectFriSatSun}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-200 font-medium transition-colors"
              >
                ⚡ ว่างทุก ศ.-ส.-อา.
              </button>
              <button
                type="button"
                onClick={handleSelectWeekends}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900/80 border border-blue-500/30 text-blue-200 font-medium transition-colors"
              >
                🌴 ว่างทุก ส.-อา.
              </button>
              {selectedDates.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  ล้าง ({selectedDates.length})
                </button>
              )}
            </div>
          </div>

          {/* Month Header Controller */}
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

            {/* Day of Week Headers */}
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

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {/* Blank placeholders before first day */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`blank-${i}`} className="h-10 sm:h-12" />
              ))}

              {/* Day numbers */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
                const isSelected = selectedDates.includes(dateStr);
                const weekend = isWeekend(dateStr);
                const friday = isFriday(dateStr);

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => toggleDate(dateStr)}
                    className={`h-11 sm:h-13 rounded-xl flex flex-col items-center justify-center relative transition-all duration-150 select-none ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/30 scale-95 border-2 border-emerald-300'
                        : weekend
                        ? 'bg-amber-950/30 border border-amber-500/30 text-amber-200 hover:border-amber-400/60 hover:bg-amber-950/50'
                        : friday
                        ? 'bg-cyan-950/30 border border-cyan-500/30 text-cyan-200 hover:border-cyan-400/60 hover:bg-cyan-950/50'
                        : 'bg-slate-900/70 border border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-sm sm:text-base font-semibold">{dayNumber}</span>
                    {isSelected && (
                      <span className="text-[10px] leading-none mt-0.5 text-emerald-100 flex items-center gap-0.5">
                        <CheckCircle2 className="w-2.5 h-2.5" /> ว่าง
                      </span>
                    )}
                    {!isSelected && (weekend || friday) && (
                      <span className="text-[9px] text-amber-400/80 leading-none mt-0.5">
                        {weekend ? 'สุดสัปดาห์' : 'วันศุกร์'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Summary Badge List */}
          {selectedDates.length > 0 && (
            <div className="p-3 bg-slate-950/70 border border-emerald-500/30 rounded-xl space-y-1.5">
              <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>วันที่มึงเลือกแล้ว ({selectedDates.length} วัน):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedDates.sort().map(d => (
                  <span
                    key={d}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 font-medium inline-flex items-center gap-1"
                  >
                    {formatThaiDate(d, 'weekday')}
                    <button
                      type="button"
                      onClick={() => toggleDate(d)}
                      className="hover:text-pink-400 text-xs font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Note / Message */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <span>ฝากข้อความถึงเพื่อนในแก๊ง</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="เช่น ขอห้องติดสระน้ำนะ, ใครเบี้ยวปรับ 500 บาท!"
            className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 text-white placeholder-slate-500 text-sm outline-none transition-all"
          />
        </div>

        {/* Success message banner */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-sm font-semibold flex items-center gap-2 animate-bounce">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-bold text-base sm:text-lg shadow-xl shadow-cyan-600/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>กำลังบันทึกข้อมูล...</span>
          ) : (
            <>
              <span>🍻</span>
              <span>{editingParticipant ? 'บันทึกการแก้ไขวันว่าง' : 'ยืนยันวันว่างของกู! (ส่งข้อมูล)'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
