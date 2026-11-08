'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'th' | 'en';

export interface Translations {
  [key: string]: string;
}

export const translations: Record<Language, Translations> = {
  th: {
    // Brand & Nav
    appName: 'วันว่าง',
    appSubtitle: 'หาเวลานัดตรงกันง่ายๆ ในไม่กี่วิ',
    createEventBtn: 'สร้างนัดใหม่ +',
    langToggleEng: 'ENG',
    langToggleTh: 'TH',

    // Home Hero
    heroBadge: 'ระบบนัดหมายกลุ่มแบบกระชับ',
    heroHeadline1: 'หาคิววันว่างตรงกัน',
    heroHeadline2: 'ในไม่กี่วินาที',
    heroDescription: 'หมดปัญหานัดเพื่อนแล้วเวลาไม่ตรงกัน ไม่ต้องสมัครสมาชิก ไม่ต้องจำรหัสผ่าน แค่ตั้งชื่อนัด เลือกช่วงวัน แล้วส่งลิงก์เข้ากลุ่มแชทได้เลย',

    // Features
    feat1Title: 'เลือกเวลาละเอียด',
    feat1Desc: 'แตะหรือลากเมาส์เลือกช่วงชั่วโมงที่สะดวกได้ตามจริง',
    feat2Title: 'แชร์ให้เพื่อนในคลิกเดียว',
    feat2Desc: 'จัดข้อความสรุปพร้อมรายชื่อคนว่าง ส่งเข้าแชทกลุ่มได้ทันที',
    feat3Title: 'ไม่ต้องล็อกอิน',
    feat3Desc: 'เพื่อนเปิดลิงก์ พิมพ์ชื่อ แล้วจิ้มเวลาได้เลย สิทธิ์คนสร้างจำในเครื่องอัตโนมัติ',

    // Create Event Form
    step1Title: '1. ข้อมูลการนัด',
    step1Subtitle: 'ระบุชื่องานและรายละเอียดสั้นๆ ให้เพื่อนเข้าใจ',
    requiredBadge: 'จำเป็น',
    eventNameLabel: 'ตั้งชื่อนัด *',
    eventNamePlaceholder: 'เช่น นัดกินชาบูกับแก๊ง, ทริปหัวหิน, ตีแบดวันหยุด, นัดประชุมงาน',
    eventNameHelper: 'ชื่อกิจกรรมหลักที่ทุกคนจะมองเห็นในลิงก์',
    categoryLabel: 'หมวดหมู่',
    locationLabel: 'สถานที่ (ถ้ามี)',
    locationPlaceholder: 'เช่น สยามพารากอน, สนามแบดพระราม 9, Zoom, Discord',
    notesLabel: 'รายละเอียดเพิ่มเติม (ถ้ามี)',
    notesPlaceholder: 'เช่น หารเท่ากัน, มีที่จอดรถ, พกโน้ตบุ๊กมาด้วย',

    // Categories
    catHangout: 'สังสรรค์ / กินข้าว',
    catTrip: 'ทริปเที่ยว / พักผ่อน',
    catSport: 'กีฬา / ออกกำลังกาย',
    catBoardgame: 'บอร์ดเกม / เล่นเกม',
    catMeeting: 'มีตติ้ง / ทำงานกลุ่ม',
    catGeneral: 'กิจกรรมทั่วไป',

    // Step 2: Dates & Range
    step2Title: '2. ช่วงวันที่อยากนัด',
    step2Subtitle: 'เลือกวันที่ต้องการเปิดให้เพื่อนๆ เข้ามาลงคะแนน',
    step2RangeTitle: '2. ช่วงที่ให้เพื่อนเลือก',
    step2RangeSubtitle: 'กำหนดกรอบเวลาที่เปิดให้เพื่อนๆ เข้ามาลงวันว่าง',
    rangePreset2Weeks: '2 สัปดาห์',
    rangePreset1Month: '1 เดือน',
    rangePreset2Months: '2 เดือน',
    rangePresetUnlimited: 'ไม่จำกัด (1 ปี)',
    rangeStartLabel: 'วันเริ่มต้น',
    rangeEndLabel: 'วันสิ้นสุด',
    rangeSummaryLabel: 'ช่วงเวลาที่เปิดให้เลือก:',
    rangeDaysCount: '{count} วัน ({range})',
    selectedDatesCount: 'เลือกแล้ว {count} วัน',
    shortcutsLabel: 'ทางลัด:',
    shortcutWeekends: '+ ส.-อา. ตลอดเดือนนี้',
    shortcutNext7Days: '+ 7 วันข้างหน้า',
    shortcutClear: 'ล้างทั้งหมด [X]',
    activeSelectionsLabel: 'วันที่เลือกไว้:',
    prevMonthBtn: '< เดือนก่อน',
    nextMonthBtn: 'เดือนถัดไป >',

    // Voting Flow
    voteCalendarPrompt: 'แตะหรือลากเลือกวันที่ตัวเองว่าง (วันสีเหลือง = สะดวก):',
    shortcutWeekendsOnly: 'ว่างทุกเสาร์-อาทิตย์',
    shortcutClearSelection: 'ล้าง',
    editResponseNote: 'คุณเคยลงวันว่างไว้แล้ว สามารถแก้ไขและกดบันทึกใหม่ได้ตลอดเวลา',
    outOfRangeNote: 'อยู่นอกช่วงที่เปิดให้ลงเวลา',
    pastDateNote: 'วันที่ผ่านมาแล้ว',

    // Results & Leaderboard
    pinnedBannerTitle: '📌 ปักหมุดวันที่นัดหมายแล้ว',
    pinnedBadge: 'ปักหมุดแล้ว',
    pinThisDate: 'ปักวันนี้',
    unpinThisDate: 'ยกเลิกการปัก',
    pinSuccessMsg: 'ปักหมุดวันที่นัดหมายเรียบร้อยแล้ว!',
    everyoneFree: 'ว่างครบทุกคน',
    closestMatch: 'ใกล้เคียงที่สุด',
    missingFriendsLabel: 'คนที่ไม่ว่าง:',
    freeRatioText: 'ว่าง {count}/{total} คน',

    // Step 3: Hours & Granularity
    step3Title: '3. กรอบเวลาในแต่ละวัน',
    step3Subtitle: 'เลือกความละเอียดของเวลาที่ต้องการให้เพื่อนลงคะแนน',
    granularityLabel: 'รูปแบบกรอบเวลา',
    granularityDay: 'ทั้งวัน',
    granularityDaypart: 'ช่วงของวัน',
    granularityHour: 'รายชั่วโมง',
    granularityDayDesc: 'เพื่อนแค่จิ้มวันที่ว่าง ง่ายที่สุด',
    granularityDaypartDesc: 'แบ่ง 4 ช่วงต่อวัน: เช้า (06–12) / บ่าย (12–17) / เย็น (17–21) / ค่ำ (21–24)',
    granularityHourDesc: 'กำหนดช่วงเวลาและโหวตละเอียดเป็นรายชั่วโมง สำหรับนัดที่ต้องการเวลาแน่นอน',
    partMorning: 'เช้า',
    partAfternoon: 'บ่าย',
    partEvening: 'เย็น',
    partNight: 'ค่ำ',
    partMorningRange: '06–12',
    partAfternoonRange: '12–17',
    partEveningRange: '17–21',
    partNightRange: '21–24',
    dayVoteFree: 'ว่าง ✓',
    dayVoteBusy: 'ไม่ว่าง -',
    votePromptDay: 'แตะวันที่คุณว่างเพื่อลงคะแนน (แตะอีกครั้งเพื่อยกเลิก):',
    votePromptDaypart: 'แตะช่วงเวลาที่คุณสะดวกในแต่ละวัน:',
    dateColumnLabel: 'วันที่',
    allDayLabel: 'ทั้งวัน',
    metaFormatDay: 'นัดหมายทั้งวัน',
    metaFormatDaypart: 'ช่วงของวัน (4 ช่วง)',
    metaFormatHour: 'รายชั่วโมง ({start} - {end} น.)',
    btnDaypartEvening: '+ ช่วงเย็น/ค่ำ',
    btnDaypartWeekend: '+ ส.-อา.',
    selectedDaysCount: 'เลือกแล้ว: {count} วัน',
    startHourLabel: 'เวลาเริ่มต้น',
    endHourLabel: 'เวลาสิ้นสุด',
    intervalLabel: 'ความละเอียดย่อย',
    interval60: 'ทุก 1 ชั่วโมง (แนะนำ)',
    interval30: 'ทุก 30 นาที',
    hoursSuffix: 'น.',
    midnight: '24:00 (เที่ยงคืน)',

    // Form Action
    formErrorTitle: 'กรุณาตั้งชื่อนัดก่อนดำเนินต่อ',
    formErrorDates: 'กรุณาเลือกวันที่อย่างน้อย 1 วัน',
    submitCreating: 'กำลังสร้างนัด...',
    submitBtn: 'สร้างนัดเลย & รับลิงก์ส่งเพื่อน ->',
    formFooterNote: 'ไม่ต้องสมัครสมาชิก • ไม่เก็บคุกกี้ติดตาม • แชร์ให้เพื่อนได้ทันที',

    // Event Page Header
    votingClosedBadge: '[ปิดรับโหวตแล้ว]',
    metaDatesLabel: 'วันเปิดโหวต: {count} วัน ({range})',
    metaHoursLabel: 'เวลา: {start} - {end} น.',
    metaLocationLabel: 'สถานที่: {loc}',

    // Share Bar
    shareLineBtn: 'แชร์ไปให้เพื่อนคุณเลย!! ->',
    copySummaryBtn: 'ก็อปปี้ข้อความสรุป',
    copySummaryDone: '[คัดลอกข้อความแล้ว]',
    copyLinkBtn: 'คัดลอกลิงก์',
    copyLinkDone: '[คัดลอกลิงก์แล้ว]',
    adminVerifiedBadge: 'สิทธิ์ผู้สร้าง [บันทึกในเครื่องนี้แล้ว]',
    copyAdminKeyBtn: 'คัดลอก KEY แอดมิน',
    copyAdminKeyDone: '[คัดลอก KEY แล้ว]',
    closeVotingBtn: 'ปิดรับโหวต',
    reopenVotingBtn: 'เปิดรับโหวตอีกครั้ง',

    // Leaderboard
    leaderboardTitle: 'ช่วงเวลาที่คนว่างตรงกันมากที่สุด',
    leaderboardSubtitle: 'แตะที่การ์ดเพื่อดูไฮไลต์ช่วงเวลาบนตาราง',
    unanimousBadge: 'ว่างตรงกันครบ 100% ทุกคน!',
    rankPrefix: 'อันดับ #{rank}',
    matchPercent: '{percent}% ว่างตรงกัน',
    durationSuffix: 'ชม.',
    freeCountText: 'ว่าง: {free}/{total} คน',
    allConfirmed: '[ครบทุกคน]',
    missingCount: '[-{count} คน]',
    availableLabel: 'คนที่ว่าง:',
    busyLabel: 'คนที่ติดธุระ:',

    // Matrix Tabs & Voting
    tabHeatmap: '[1] ดูเวลารวมของกลุ่ม ({count})',
    tabVote: '[2] ลงเวลาว่างของฉัน ({count})',
    densityZero: '0% ว่าง',
    densityAll: '100% ครบทุกคน',
    votingClosedAlert: 'ผู้สร้างได้ปิดรับโหวตกิจกรรมนี้แล้ว',
    yourNameLabel: 'ชื่อของคุณ (Display Name) *',
    yourNamePlaceholder: 'พิมพ์ชื่อเล่นหรือชื่อจริงของคุณ',
    yourNoteLabel: 'โน้ตเพิ่มเติม (ถ้ามี)',
    yourNotePlaceholder: 'เช่น สะดวกหลัง 18:00 เท่านั้น, มาสายได้นิดหน่อย',
    dragInstructions: 'คลิกหรือลากเมาส์/นิ้ว เพื่อเลือกช่วงเวลาที่คุณสะดวก:',
    btnEvening: '+ ช่วงค่ำ (18:00+)',
    btnWeekend: '+ ส.-อา.',
    btnSelectAll: 'เลือกทั้งหมด',
    btnReset: 'ล้างที่เลือก',
    timeColumnLabel: 'เวลา',
    errorNameRequired: 'กรุณากรอกชื่อของคุณ',
    errorSlotRequired: 'กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่อง',
    saveSuccessMsg: 'บันทึกเวลาว่างของคุณเรียบร้อยแล้ว! กำลังเปิดดูกราฟเวลารวม...',
    selectedSlotsCount: 'เลือกแล้ว: {count} ช่วงเวลา',
    savingDataBtn: 'กำลังบันทึกข้อมูล...',
    saveMyAvailabilityBtn: 'บันทึกเวลาว่างของฉัน [ENTER]',

    // Matrix Heatmap Inspector
    inspectTitle: 'รายละเอียดช่วงเวลา',
    inspectSubtitle: 'แตะหรือคลิกช่องเวลาเพื่อดูรายชื่อเพื่อน',
    emptyHeatmapTitle: 'ยังไม่มีใครลงเวลา',
    emptyHeatmapDesc: 'มาร่วมลงเวลาคนแรก หรือแชร์ลิงก์ให้เพื่อนๆ ในกลุ่ม',
    recordFirstBtn: 'ลงเวลาว่างคนแรก ->',
    dataHeader: '[ข้อมูล] {date} @ {time} น.',
    confirmedFreeLabel: '+ คนที่ว่าง ({count}):',
    busyListLabel: '- คนที่ไม่ว่าง ({count}):',
    noneLabel: 'ไม่มี',
    allAvailableLabel: 'ว่างครบทุกคน',

    // Participants Roster
    rosterTitle: 'รายชื่อเพื่อนที่ลงเวลาแล้ว ({count} คน)',
    youTag: '[คุณ]',
    slotsLogged: '• สะดวก {count} ช่วงเวลา',
    deleteBtn: 'ลบข้อมูล [X]',
    deleteConfirm: 'ยืนยันการลบข้อมูลของ: "{name}" หรือไม่?',

    // Footer
    footerText: 'วันว่าง // ระบบนัดหมายที่ตรงไปตรงมาและรวดเร็ว',
    notFoundTitle: 'ไม่พบกิจกรรมนี้',
    notFoundDesc: 'ลิงก์กิจกรรมอาจไม่ถูกต้อง หรือกิจกรรมถูกลบไปแล้ว',
    returnHomeBtn: 'กลับหน้าหลัก',
  },

  en: {
    // Brand & Nav
    appName: 'WanWang',
    appSubtitle: 'Find common time in seconds',
    createEventBtn: 'Create Event +',
    langToggleEng: 'ENG',
    langToggleTh: 'TH',

    // Home Hero
    heroBadge: 'Minimalist Group Scheduler',
    heroHeadline1: 'Find common time',
    heroHeadline2: 'in seconds',
    heroDescription: 'No login required. No passwords. Name your event, pick candidate dates, and drop the link directly into your group chat.',

    // Features
    feat1Title: 'Hourly precision',
    feat1Desc: 'Click and drag across time slots to indicate exact availability.',
    feat2Title: '1-Click share with friends',
    feat2Desc: 'Formatted text summary ready to paste into any chat app.',
    feat3Title: 'Zero login',
    feat3Desc: 'Friends open the link, type their name, and pick times. Admin token saved locally.',

    // Create Event Form
    step1Title: '1. Event details',
    step1Subtitle: 'Give your event a clear title and brief description',
    requiredBadge: 'REQUIRED',
    eventNameLabel: 'Event title *',
    eventNamePlaceholder: 'e.g. Q4 Planning, Dinner Party, Badminton, Weekend Trip',
    eventNameHelper: 'The main title everyone will see on the invite link',
    categoryLabel: 'Category',
    locationLabel: 'Location (optional)',
    locationPlaceholder: 'e.g. CentralWorld, Zoom, Discord, Siam Paragon',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'e.g. Split bills equally, bring gym shoes, parking available',

    // Categories
    catHangout: 'Hangout / Dinner',
    catTrip: 'Trip / Travel',
    catSport: 'Sports / Workout',
    catBoardgame: 'Boardgame / Gaming',
    catMeeting: 'Meeting / Teamwork',
    catGeneral: 'General Event',

    // Step 2: Dates & Range
    step2Title: '2. Pick your dates',
    step2Subtitle: 'Select candidate dates for participants to vote on',
    step2RangeTitle: '2. Date range for friends',
    step2RangeSubtitle: 'Set the date window when friends can mark their availability',
    rangePreset2Weeks: '2 Weeks',
    rangePreset1Month: '1 Month',
    rangePreset2Months: '2 Months',
    rangePresetUnlimited: 'Unlimited (1 Year)',
    rangeStartLabel: 'Start date',
    rangeEndLabel: 'End date',
    rangeSummaryLabel: 'Open window:',
    rangeDaysCount: '{count} days ({range})',
    selectedDatesCount: '{count} dates selected',
    shortcutsLabel: 'Shortcuts:',
    shortcutWeekends: '+ All Sat-Sun this month',
    shortcutNext7Days: '+ Next 7 days',
    shortcutClear: 'Clear all [X]',
    activeSelectionsLabel: 'Selected dates:',
    prevMonthBtn: '< Prev',
    nextMonthBtn: 'Next >',

    // Voting Flow
    voteCalendarPrompt: 'Tap or drag to select dates you are free (Yellow = Free):',
    shortcutWeekendsOnly: 'All Sat-Sun',
    shortcutClearSelection: 'Clear',
    editResponseNote: 'You previously submitted. You can adjust and re-save anytime.',
    outOfRangeNote: 'Outside event range',
    pastDateNote: 'Past date',

    // Results & Leaderboard
    pinnedBannerTitle: '📌 Confirmed event date',
    pinnedBadge: 'PINNED',
    pinThisDate: 'Pin this date',
    unpinThisDate: 'Unpin date',
    pinSuccessMsg: 'Date pinned successfully!',
    everyoneFree: 'Everyone is free',
    closestMatch: 'Closest match',
    missingFriendsLabel: 'Unavailable:',
    freeRatioText: 'Free: {count}/{total}',

    // Step 3: Hours & Granularity
    step3Title: '3. Daily time boundary',
    step3Subtitle: 'Choose the time precision for friends to vote',
    granularityLabel: 'Time format',
    granularityDay: 'All day',
    granularityDaypart: 'Day parts',
    granularityHour: 'Hourly',
    granularityDayDesc: 'Participants simply pick available dates. Simplest option.',
    granularityDaypartDesc: '4 parts per day: Morning (06–12) / Afternoon (12–17) / Evening (17–21) / Night (21–24)',
    granularityHourDesc: 'Set specific hours and vote in hourly slots. For precise schedules.',
    partMorning: 'Morning',
    partAfternoon: 'Afternoon',
    partEvening: 'Evening',
    partNight: 'Night',
    partMorningRange: '06–12',
    partAfternoonRange: '12–17',
    partEveningRange: '17–21',
    partNightRange: '21–24',
    dayVoteFree: 'Free ✓',
    dayVoteBusy: 'Busy -',
    votePromptDay: 'Tap dates you are available (tap again to deselect):',
    votePromptDaypart: 'Tap the time parts you are free on each date:',
    dateColumnLabel: 'Date',
    allDayLabel: 'All day',
    metaFormatDay: 'All-day event',
    metaFormatDaypart: 'Day parts (4 slots/day)',
    metaFormatHour: 'Hourly ({start} - {end})',
    btnDaypartEvening: '+ Evenings/Nights',
    btnDaypartWeekend: '+ Weekends',
    selectedDaysCount: 'Selected: {count} days',
    startHourLabel: 'Start hour',
    endHourLabel: 'End hour',
    intervalLabel: 'Grid interval',
    interval60: 'Every 60 mins (Recommended)',
    interval30: 'Every 30 mins',
    hoursSuffix: '',
    midnight: '12:00 AM (Midnight)',

    // Form Action
    formErrorTitle: 'Event title is required',
    formErrorDates: 'Please select at least 1 date',
    submitCreating: 'Creating event...',
    submitBtn: 'Create event & get link ->',
    formFooterNote: 'No sign up required • No tracking cookies • Instant link generation',

    // Event Page Header
    votingClosedBadge: '[VOTING CLOSED]',
    metaDatesLabel: 'Dates: {count} days ({range})',
    metaHoursLabel: 'Hours: {start} - {end}',
    metaLocationLabel: 'Location: {loc}',

    // Share Bar
    shareLineBtn: 'Share it with your friends!! ->',
    copySummaryBtn: 'Copy summary text',
    copySummaryDone: '[Summary copied]',
    copyLinkBtn: 'Copy link',
    copyLinkDone: '[Link copied]',
    adminVerifiedBadge: 'Admin verified [Saved on this device]',
    copyAdminKeyBtn: 'Copy admin key',
    copyAdminKeyDone: '[Key copied]',
    closeVotingBtn: 'Close voting',
    reopenVotingBtn: 'Re-open voting',

    // Leaderboard
    leaderboardTitle: 'Top matches',
    leaderboardSubtitle: 'Tap a card to highlight matching slots on the matrix',
    unanimousBadge: '100% unanimous consensus!',
    rankPrefix: 'Rank #{rank}',
    matchPercent: '{percent}% match',
    durationSuffix: 'hrs',
    freeCountText: 'Free: {free}/{total}',
    allConfirmed: '[All confirmed]',
    missingCount: '[-{count}]',
    availableLabel: 'Available:',
    busyLabel: 'Busy:',

    // Matrix Tabs & Voting
    tabHeatmap: '[1] Group Heatmap ({count})',
    tabVote: '[2] My availability ({count})',
    densityZero: '0% Free',
    densityAll: '100% All In',
    votingClosedAlert: 'Voting has been closed by the organizer.',
    yourNameLabel: 'Your name (Display name) *',
    yourNamePlaceholder: 'Enter your first name or nickname',
    yourNoteLabel: 'Note (optional)',
    yourNotePlaceholder: 'e.g. Free after 6:00 PM only, might arrive slightly late',
    dragInstructions: 'Click or drag across slots to mark when you are free:',
    btnEvening: '+ Evenings (18:00+)',
    btnWeekend: '+ Weekends',
    btnSelectAll: 'Select all',
    btnReset: 'Clear selected',
    timeColumnLabel: 'Time',
    errorNameRequired: 'Please enter your name',
    errorSlotRequired: 'Please select at least 1 time slot',
    saveSuccessMsg: 'Your availability has been saved! Loading group matrix...',
    selectedSlotsCount: 'Selected: {count} slots',
    savingDataBtn: 'Saving...',
    saveMyAvailabilityBtn: 'Save my availability [ENTER]',

    // Matrix Heatmap Inspector
    inspectTitle: 'Slot details',
    inspectSubtitle: 'Tap any cell to inspect who is free',
    emptyHeatmapTitle: 'No responses yet',
    emptyHeatmapDesc: 'Be the first to submit your times, or share the link with your group.',
    recordFirstBtn: 'Submit first response ->',
    dataHeader: '[Slot] {date} @ {time}',
    confirmedFreeLabel: '+ Available ({count}):',
    busyListLabel: '- Busy ({count}):',
    noneLabel: 'None',
    allAvailableLabel: 'Everyone is available',

    // Participants Roster
    rosterTitle: 'Participants ({count})',
    youTag: '[You]',
    slotsLogged: '• {count} slots selected',
    deleteBtn: 'Delete [X]',
    deleteConfirm: 'Are you sure you want to delete data for: "{name}"?',

    // Footer
    footerText: 'WanWang // Straightforward group scheduling interface',
    notFoundTitle: 'Event not found',
    notFoundDesc: 'The link might be broken or this event was removed.',
    returnHomeBtn: 'Return to home',
  },
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = 'wanwang_lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default language is 'th'
  const [lang, setLangState] = useState<Language>('th');

  // Load from localStorage on mount safely
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'th' || saved === 'en') {
        setLangState(saved);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = saved;
        }
      } else {
        if (typeof document !== 'undefined') {
          document.documentElement.lang = 'th';
        }
      }
    } catch {
      // Ignore localStorage access errors
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY, newLang);
    } catch {
      // Ignore localStorage write error
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLang;
    }
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.th;
    let text = dict[key] || translations.th[key] || key;

    if (params) {
      Object.entries(params).forEach(([paramKey, paramVal]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      });
    }

    return text;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
