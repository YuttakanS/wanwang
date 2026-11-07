'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import QuickShare from '@/components/QuickShare';
import BestDatesLeaderboard from '@/components/BestDatesLeaderboard';
import HeatmapCalendar from '@/components/HeatmapCalendar';
import AvailabilityForm from '@/components/AvailabilityForm';
import ParticipantsList from '@/components/ParticipantsList';
import { Participant } from '@/types';

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  const formRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const rosterRef = useRef<HTMLDivElement>(null);

  const fetchParticipants = async () => {
    try {
      const res = await fetch('/api/participants');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setParticipants(data.data);
      }
    } catch (err) {
      console.error('Failed to load participants', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const handleFormSuccess = (participant: Participant) => {
    // Refresh data
    fetchParticipants();
    setEditingParticipant(null);
    // Smooth scroll to leaderboard after submission
    if (summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleEdit = (p: Participant) => {
    setEditingParticipant(p);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/participants?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setParticipants(data.data);
      }
    } catch (err) {
      console.error('Failed to delete participant', err);
    }
  };

  const handleResetData = async () => {
    if (confirm('ต้องการโหลดข้อมูลตัวอย่างกลับมาใหม่หรือไม่?')) {
      try {
        const res = await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reset' }),
        });
        const data = await res.json();
        if (data.success) {
          setParticipants(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด เพื่อให้เพื่อนๆ เริ่มลงชื่อจริง?')) {
      try {
        const res = await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear' }),
        });
        const data = await res.json();
        if (data.success) {
          setParticipants([]);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Hero Header */}
      <Header
        participants={participants}
        onScrollToForm={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onScrollToSummary={() => summaryRef.current?.scrollIntoView({ behavior: 'smooth' })}
        onScrollToRoster={() => rosterRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Quick Share to LINE Banner */}
        <QuickShare participants={participants} />

        {/* Section 1: Top Dates Leaderboard */}
        <div ref={summaryRef} className="scroll-mt-6">
          <BestDatesLeaderboard
            participants={participants}
            onSelectDate={date => {
              setSelectedDate(date);
              // scroll to calendar heatmap
              const el = document.getElementById('heatmap-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        </div>

        {/* Section 2: Heatmap Calendar */}
        <div id="heatmap-section" className="scroll-mt-6">
          <HeatmapCalendar
            participants={participants}
            selectedDate={selectedDate}
            onSelectDate={date => setSelectedDate(date)}
          />
        </div>

        {/* Section 3: Availability Form */}
        <div ref={formRef} className="scroll-mt-6">
          <AvailabilityForm
            onSuccess={handleFormSuccess}
            editingParticipant={editingParticipant}
            onCancelEdit={() => setEditingParticipant(null)}
          />
        </div>

        {/* Section 4: Squad Roster List */}
        <div ref={rosterRef} className="scroll-mt-6">
          <ParticipantsList
            participants={participants}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onResetData={handleResetData}
            onClearAll={handleClearAll}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-slate-900 bg-slate-950/80 text-center text-xs text-slate-500 px-4">
        <p className="font-medium text-slate-400">
          🍻 ทริปวันว่าง • รวมพลคนคอแข็ง
        </p>
        <p className="mt-1 text-slate-600">
          สร้างขึ้นเพื่อหาคิวว่างตรงกันของแก๊งเพื่อน • รองรับมือถือและเปิดใน LINE ได้ 100%
        </p>
      </footer>
    </div>
  );
}
