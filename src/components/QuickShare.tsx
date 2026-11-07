'use client';

import React, { useState } from 'react';
import { Copy, Check, Share2, MessageCircle, Sparkles } from 'lucide-react';
import { Participant } from '@/types';
import { generateLineShareSummary } from '@/lib/utils';

interface QuickShareProps {
  participants: Participant[];
}

export default function QuickShare({ participants }: QuickShareProps) {
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const getWebUrl = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://wanwang.vercel.app';
  };

  const handleCopySummary = async () => {
    const text = generateLineShareSummary(participants, getWebUrl());
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch (err) {
      console.error('Failed to copy summary:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getWebUrl());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleNativeShare = async () => {
    const text = generateLineShareSummary(participants, getWebUrl());
    if (navigator.share) {
      try {
        await navigator.share({
          title: '🍻 วันว่าง - โหวตวันว่าง',
          text: text,
          url: getWebUrl(),
        });
      } catch (err) {
        console.log('Share canceled or failed', err);
      }
    } else {
      handleCopySummary();
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-950/70 via-slate-900/90 to-teal-950/70 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-xl text-white backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Side: Info */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg text-emerald-300 flex items-center gap-1.5">
              <span>แชร์สรุปผลเข้ากลุ่ม LINE</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                1-Click Copy
              </span>
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
              กดก๊อปปี้สรุปวันว่างที่มีคนว่างเยอะสุด แล้วส่งเข้ากลุ่มเพื่อนได้ทันที!
            </p>
          </div>
        </div>

        {/* Right Side: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Summary Button */}
          <button
            onClick={handleCopySummary}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-emerald-900/40 transition-all hover:scale-105 active:scale-95"
          >
            {copiedSummary ? (
              <>
                <Check className="w-4 h-4 text-emerald-200 animate-bounce" />
                <span>คัดลอกข้อความแล้ว! 🎉</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>คัดลอกสรุปส่ง LINE 📲</span>
              </>
            )}
          </button>

          {/* Native Share button */}
          <button
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs sm:text-sm font-medium transition-colors"
            title="แชร์ด้วยมือถือ"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">แชร์</span>
          </button>

          {/* Copy simple link button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs sm:text-sm font-medium transition-colors"
            title="คัดลอกเฉพาะลิงก์เว็บ"
          >
            {copiedLink ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <span className="text-xs">🔗 ลิงก์</span>
            )}
          </button>

          {/* Preview Toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs text-slate-400 hover:text-emerald-300 underline underline-offset-2 ml-1"
          >
            {showPreview ? 'ซ่อนตัวอย่าง' : 'ดูตัวอย่างข้อความ'}
          </button>
        </div>
      </div>

      {/* Message Preview Box */}
      {showPreview && (
        <div className="mt-4 p-3.5 bg-slate-950/80 rounded-xl border border-emerald-500/20 text-xs font-mono text-emerald-200/90 whitespace-pre-wrap leading-relaxed">
          {generateLineShareSummary(participants, getWebUrl())}
        </div>
      )}
    </div>
  );
}
