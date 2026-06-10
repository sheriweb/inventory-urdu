export type DailySummaryStats = {
  todayCollectionCount: number;
  todayCollectionAmount: number;
  todayDueCount: number;
  overdueCount: number;
  defaultedAccountsCount: number;
  pendingReminderCount: number;
  newSalesCount: number;
  newSalesAmount: number;
  tomorrowDueCount: number;
  tomorrowDueAmount: number;
};

export type LateCustomerLine = {
  name: string;
  accountNumber: number;
  owedAmount: number;
};

function fmtMoney(n: number): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDateUrdu(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ur-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function buildDailySummaryParagraph(
  shopName: string,
  dateIso: string,
  stats: DailySummaryStats,
  topLate: LateCustomerLine[],
): string {
  const lines: string[] = [];
  const dateLabel = fmtDateUrdu(dateIso);

  lines.push(`📋 ${shopName} — روزانہ خلاصہ`);
  lines.push(dateLabel);
  lines.push('');

  if (stats.todayCollectionCount > 0) {
    lines.push(
      `✅ آج وصولی: ${stats.todayCollectionCount} قسطیں، کل Rs ${fmtMoney(stats.todayCollectionAmount)}`,
    );
  } else {
    lines.push('✅ آج ابھی تک کوئی قسط وصولی نہیں ہوئی');
  }

  if (stats.newSalesCount > 0) {
    lines.push(
      `🛒 نئی فروخت: ${stats.newSalesCount} کھاتے، Rs ${fmtMoney(stats.newSalesAmount)}`,
    );
  }

  lines.push(
    `📅 آج واجب قسطیں: ${stats.todayDueCount} | ⏰ تاخیر: ${stats.overdueCount} | ⚠️ ڈیفالٹ کھاتے: ${stats.defaultedAccountsCount}`,
  );

  if (stats.tomorrowDueCount > 0) {
    lines.push(
      `🎯 کل کی ہدف: ${stats.tomorrowDueCount} قسطیں (تقریباً Rs ${fmtMoney(stats.tomorrowDueAmount)})`,
    );
  } else {
    lines.push('🎯 کل کوئی واجب قسط نہیں');
  }

  if (stats.pendingReminderCount > 0) {
    lines.push(`🔔 ${stats.pendingReminderCount} گاہکوں کو یاد دہانی بھیجیں (2 دن بعد واجب)`);
  }

  if (topLate.length > 0) {
    lines.push('');
    lines.push('تاخیر والے گاہک (اہم):');
    for (const row of topLate.slice(0, 3)) {
      lines.push(`• ${row.name} — کھاتہ #${row.accountNumber} — بقایا Rs ${fmtMoney(row.owedAmount)}`);
    }
  }

  lines.push('');
  if (stats.overdueCount > 0) {
    lines.push('💡 آج ریکوری پر توجہ دیں — تاخیر والے کھاتے پہلے وصول کریں');
  } else if (stats.todayDueCount > 0) {
    lines.push('💡 آج واجب قسطوں کی وصولی مکمل کریں');
  } else {
    lines.push('💡 آج کا شیڈول ہلکا ہے — نئی فروخت یا یاد دہانیاں دیکھیں');
  }

  return lines.join('\n');
}
