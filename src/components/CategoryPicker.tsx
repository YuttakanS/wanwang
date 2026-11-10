'use client';

import { EVENT_CATEGORIES, EventCategory } from '@/types';
import { useI18n } from '@/lib/i18n';

export const CATEGORY_LABEL_KEYS: Record<EventCategory, string> = {
  hangout: 'catHangout',
  trip: 'catTrip',
  sport: 'catSport',
  boardgame: 'catBoardgame',
  meeting: 'catMeeting',
  general: 'catGeneral',
};

interface CategoryPickerProps {
  value: EventCategory;
  onChange: (category: EventCategory) => void;
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {EVENT_CATEGORIES.map(cat => {
        const isSelected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(cat.id)}
            className={`px-3 py-2 border-2 border-ink text-xs font-semibold text-left transition-none ${
              isSelected
                ? 'bg-ink text-on-ink-accent motion-pop'
                : 'bg-surface text-ink hover:bg-sunken'
            }`}
          >
            {t(CATEGORY_LABEL_KEYS[cat.id])}
          </button>
        );
      })}
    </div>
  );
}
