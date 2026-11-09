'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import SiteFooter from '@/components/SiteFooter';
import { useI18n } from '@/lib/i18n';
import { PRIVACY_CONTENT, PrivacySection } from '@/lib/privacyContent';

const contactEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t-3 border-black pt-4">
      <h2 className="text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function ContentSection({ section }: { section: PrivacySection }) {
  return (
    <Section title={section.title}>
      {section.paragraphs.map(text => (
        <p key={text} className="text-sm text-[#333333] leading-relaxed">
          {text}
        </p>
      ))}
    </Section>
  );
}

export default function PrivacyNotice() {
  const { lang } = useI18n();
  const content = PRIVACY_CONTENT[lang];

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Navbar />
      <main className="flex-1 w-full max-w-2xl mx-auto py-10 px-4">
        <div className="border-3 border-black p-5 sm:p-6 bg-white space-y-5">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold">{content.title}</h1>
            <p className="font-mono text-xs text-[#525252]">{content.updated}</p>
          </header>

          {content.sections.map(section => (
            <ContentSection key={section.title} section={section} />
          ))}

          {contactEmail && (
            <Section title={content.contactTitle}>
              <p className="text-sm text-[#333333] leading-relaxed">
                {content.contactBody}{' '}
                <a href={`mailto:${contactEmail}`} className="font-bold underline break-all">
                  {contactEmail}
                </a>
              </p>
            </Section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
