'use client';

import React, { useState } from 'react';
import {
  Users,
  Calendar,
  Beer,
  MessageSquare,
  Edit2,
  Trash2,
  RotateCcw,
  Trash,
} from 'lucide-react';
import { Participant } from '@/types';
import { formatThaiDate } from '@/lib/utils';

interface ParticipantsListProps {
  participants: Participant[];
  onEdit: (participant: Participant) => void;
  onDelete: (id: string) => void;
  onResetData: () => void;
  onClearAll: () => void;
}

export default function ParticipantsList({
  participants,
  onEdit,
  onDelete,
  onResetData,
  onClearAll,
}: ParticipantsListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>รายชื่อแก๊งทริป</span>
              <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30">
                {participants.length} คน
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              รายชื่อเพื่อนๆ ที่ส่งวันว่างเข้ามาแล้ว (สามารถกดแก้ไขหรือลบชื่อได้)
            </p>
          </div>
        </div>

        {/* Admin reset / clear options */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onResetData}
            title="รีเซ็ตเป็นข้อมูลตัวอย่าง"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">ใส่ตัวอย่างใหม่</span>
          </button>
          <button
            type="button"
            onClick={onClearAll}
            title="ล้างข้อมูลทั้งหมดเพื่อเริ่มใช้จริง"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-300 text-xs font-medium transition-colors"
          >
            <Trash className="w-3.5 h-3.5" />
            <span>ล้างทั้งหมด</span>
          </button>
        </div>
      </div>

      {participants.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400">
          <div className="text-3xl mb-2">🏝️</div>
          <p className="text-sm">ยังไม่มีเพื่อนคนไหนลงชื่อเลย เป็นคนแรกที่เริ่มเปิดตี้สิ!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {participants.map(p => (
            <div
              key={p.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex flex-col justify-between shadow-lg"
            >
              <div>
                {/* Header: Name & Role */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                      <span>{p.name}</span>
                    </h3>
                    <span className="inline-block mt-0.5 text-xs px-2.5 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/30 text-cyan-300 font-medium">
                      {p.partyRole}
                    </span>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(p)}
                      title="แก้ไขข้อมูล"
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(p.id)}
                      title={confirmDeleteId === p.id ? 'กดยืนยันเพื่อลบ' : 'ลบข้อมูล'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        confirmDeleteId === p.id
                          ? 'bg-red-600 text-white border-red-500 animate-pulse text-[11px] px-2'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-red-400 border-slate-800'
                      }`}
                    >
                      {confirmDeleteId === p.id ? 'ยืนยันลบ?' : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Details: Favorite drink */}
                {p.favoriteDrink && (
                  <div className="text-xs text-amber-300 flex items-center gap-1.5 mt-2 bg-amber-950/20 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                    <Beer className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="truncate">เครื่องดื่ม/กับข้าว: {p.favoriteDrink}</span>
                  </div>
                )}

                {/* Details: Note */}
                {p.note && (
                  <div className="text-xs text-slate-300 flex items-start gap-1.5 mt-2 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-purple-400 mt-0.5" />
                    <span className="italic leading-relaxed">"{p.note}"</span>
                  </div>
                )}

                {/* Dates Selected */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    <span>วันที่สะดวก ({p.availableDates.length} วัน):</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.availableDates.map(d => (
                      <span
                        key={d}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-emerald-300 border border-emerald-500/20 font-medium"
                      >
                        {formatThaiDate(d, 'weekday')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
