import { Document, Page, Text, View } from "@react-pdf/renderer";
import type { YearlyLoanSummary, YearlyStatement } from "@/lib/yearStatement";
import { formatCompactNumber, formatCurrency, formatDate, formatNumber, formatYear, getShortMonthNames } from "@/lib/format";
import { BAD, Empty, GOOD, MUTED, s, Table, type Money } from "./StatementDocument";
import type { StatementLabels } from "./StatementDocument";

/** Labels for the yearly PDF: `t` reads the "YearView" namespace, `tStatement` the shared "Statement" one. */
export interface YearlyStatementLabels extends Omit<StatementLabels, "t" | "walletType"> {
  t: (key: string, values?: Record<string, string | number>) => string;
  tStatement: (key: string, values?: Record<string, string | number>) => string;
}

function LoanBlock({ title, data, labels, money }: { title: string; data: YearlyLoanSummary; labels: string[]; money: Money }) {
  const values = [data.opening, data.increased, data.decreased, data.closing];
  return (
    <View style={{ flex: 1 }} wrap={false}>
      <Text style={s.sectionTitle}>{title}</Text>
      {labels.map((label, i) => (
        <View key={label} style={i === 3 ? s.totalRow : s.row}>
          <Text style={[s.cell, i === 3 ? s.bold : {}, { flex: 3 }]}>{label}</Text>
          <Text style={[s.cell, s.right, i === 3 ? s.bold : {}, { flex: 2 }]}>{money(values[i])}</Text>
        </View>
      ))}
    </View>
  );
}

export function YearlyStatementDocument({
  statement: d,
  labels: L,
  currency = "BDT",
}: {
  statement: YearlyStatement;
  labels: YearlyStatementLabels;
  currency?: string;
}) {
  const { t, tStatement } = L;
  const money: Money = (n) => formatCurrency(n, currency, L.locale);
  const compact = (n: number) => (n === 0 ? "—" : formatCompactNumber(Math.round(n), L.locale));
  const months = getShortMonthNames(L.locale);
  const period = formatYear(d.year, L.locale);
  const generated = formatDate(new Date().toISOString().slice(0, 10), L.locale);
  const sm = d.summary;

  const tiles: { label: string; value: string; color?: string }[] = [
    { label: t("earnedThisYear"), value: money(sm.income), color: GOOD },
    { label: t("spentThisYear"), value: money(sm.expense), color: BAD },
    { label: t("savedThisYear"), value: money(sm.saved) },
    { label: t("leftOver"), value: money(sm.net), color: sm.net >= 0 ? GOOD : BAD },
    { label: t("startOfYear"), value: money(sm.liquidOpening) },
    { label: t("endOfYear"), value: money(sm.liquidClosing) },
  ];

  return (
    <Document title={`${t("yearlyStatementTitle")} — ${period}`} author="Extrack" creator="Extrack" producer="Extrack">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Extrack</Text>
            <Text style={s.title}>{t("yearlyStatementTitle")}</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{period}</Text>
          </View>
          <View>
            <Text style={s.meta}>{tStatement("preparedFor", { name: d.userName })}</Text>
            <Text style={s.meta}>{tStatement("generatedOn", { date: generated })}</Text>
            <Text style={s.meta}>{t("transactionCount", { count: formatNumber(sm.transactionCount, L.locale) })}</Text>
          </View>
        </View>

        <View style={s.summary}>
          {tiles.map((tile) => (
            <View key={tile.label} style={s.tile}>
              <Text style={s.tileLabel}>{tile.label}</Text>
              <Text style={[s.tileValue, tile.color ? { color: tile.color } : {}]}>{tile.value}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle} minPresenceAhead={70}>{t("monthByMonth")}</Text>
          <Table cols={[2, 2, 2, 2, 2]} right={[1, 2, 3, 4]} head={[t("month"), t("income"), t("expense"), t("saved"), t("leftOver")]}>
            {d.months.map((m, i) => (
              <View key={m.month} style={s.row} wrap={false}>
                <Text style={[s.cell, { flex: 2 }]}>{months[i]}</Text>
                <Text style={[s.cell, s.right, { flex: 2 }]}>{compact(m.income)}</Text>
                <Text style={[s.cell, s.right, { flex: 2 }]}>{compact(m.expense)}</Text>
                <Text style={[s.cell, s.right, { flex: 2 }]}>{compact(m.saved)}</Text>
                <Text style={[s.cell, s.right, { flex: 2, color: m.net < 0 ? BAD : undefined }]}>{compact(m.net)}</Text>
              </View>
            ))}
            <View style={s.totalRow} wrap={false}>
              <Text style={[s.cell, s.bold, { flex: 2 }]}>{t("total")}</Text>
              <Text style={[s.cell, s.right, s.bold, { flex: 2 }]}>{money(sm.income)}</Text>
              <Text style={[s.cell, s.right, s.bold, { flex: 2 }]}>{money(sm.expense)}</Text>
              <Text style={[s.cell, s.right, s.bold, { flex: 2 }]}>{money(sm.saved)}</Text>
              <Text style={[s.cell, s.right, s.bold, { flex: 2 }]}>{money(sm.net)}</Text>
            </View>
          </Table>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle} minPresenceAhead={90}>{t("expenseMatrix")}</Text>
          {d.expenseMatrix.length === 0 ? (
            <Empty text={t("noExpenses")} />
          ) : (
            <Table cols={[3, ...months.map(() => 1.5), 2]} right={[...months.map((_, i) => i + 1), 13]} head={[t("category"), ...months, t("total")]}>
              {d.expenseMatrix.map((row) => (
                <View key={row.category} style={s.row} wrap={false}>
                  <Text style={[s.cell, { flex: 3 }]}>{L.category(row.category)}</Text>
                  {row.months.map((v, i) => (
                    <Text key={i} style={[s.cell, s.right, { flex: 1.5, fontSize: 8 }]}>{compact(v)}</Text>
                  ))}
                  <Text style={[s.cell, s.right, s.bold, { flex: 2, fontSize: 8 }]}>{compact(row.total)}</Text>
                </View>
              ))}
              <View style={s.totalRow} wrap={false}>
                <Text style={[s.cell, s.bold, { flex: 3 }]}>{t("total")}</Text>
                {d.months.map((m) => (
                  <Text key={m.month} style={[s.cell, s.right, s.bold, { flex: 1.5, fontSize: 8 }]}>{compact(m.expense)}</Text>
                ))}
                <Text style={[s.cell, s.right, s.bold, { flex: 2, fontSize: 8 }]}>{compact(sm.expense)}</Text>
              </View>
            </Table>
          )}
        </View>

        <View style={[s.section, { flexDirection: "row", gap: 16 }]} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>{t("incomeSources")}</Text>
            {d.incomeByCategory.length === 0 ? (
              <Empty text={t("noIncome")} />
            ) : (
              d.incomeByCategory.map((c) => (
                <View key={c.category} style={s.row}>
                  <Text style={[s.cell, { flex: 3 }]}>{L.category(c.category)}</Text>
                  <Text style={[s.cell, s.right, { flex: 2 }]}>{money(c.amount)}</Text>
                </View>
              ))
            )}
          </View>
          <LoanBlock title={t("debtTitle")} data={d.debt} money={money} labels={[t("openingBalance"), t("borrowed"), t("paidDown"), t("closingBalance")]} />
          <LoanBlock title={t("lendTitle")} data={d.lend} money={money} labels={[t("openingBalance"), t("lent"), t("paidBack"), t("closingBalance")]} />
        </View>

        <View style={s.footer} fixed>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              tStatement("pageOf", { page: formatNumber(pageNumber, L.locale), total: formatNumber(totalPages, L.locale) })
            }
          />
          <Text style={s.watermark}>
            {tStatement("poweredBy")} <Text style={s.watermarkBrand}>Extrack</Text> × <Text style={s.watermarkBrand}>Astro</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
