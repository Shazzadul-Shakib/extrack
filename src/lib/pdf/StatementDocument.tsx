import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type {
  MonthlyStatement,
  StatementCategoryTotal,
  StatementLoanSection,
  StatementRow,
  StatementWalletLine,
} from "@/lib/statement";
import type { WalletType } from "@/lib/types";
import { formatCurrency, formatDate, formatDateShort, formatNumber, formatYear, monthLabel } from "@/lib/format";
import { STATEMENT_FONT } from "./fonts";

/** What the document needs to speak the user's language — built once on the server from next-intl. */
export interface StatementLabels {
  locale: string;
  /** Translator for the "Statement" namespace. */
  t: (key: string, values?: Record<string, string | number>) => string;
  category: (category: string) => string;
  walletType: (type: WalletType) => string;
}

const INK = "#0b0b0b";
const MUTED = "#6b6a66";
const LINE = "#e1e0d9";
const BRAND = "#1c3a5e";
const BRAND_SOFT = "#e7edf3";
const GOOD = "#0c7a0c";
const BAD = "#c23030";

const s = StyleSheet.create({
  page: { fontFamily: STATEMENT_FONT, fontSize: 9, color: INK, paddingTop: 36, paddingHorizontal: 36, paddingBottom: 60 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: BRAND },
  brand: { fontSize: 11, fontWeight: 700, color: BRAND, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: 700 },
  meta: { fontSize: 8.5, color: MUTED, textAlign: "right", lineHeight: 1.5 },
  summary: { flexDirection: "row", gap: 8, marginTop: 14 },
  tile: { flexGrow: 1, flexBasis: 0, backgroundColor: BRAND_SOFT, borderRadius: 4, padding: 8 },
  tileLabel: { fontSize: 8, color: MUTED, marginBottom: 3 },
  tileValue: { fontSize: 12, fontWeight: 700 },
  section: { marginTop: 18 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: BRAND, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: LINE, marginBottom: 6 },
  subTitle: { fontSize: 8.5, fontWeight: 700, color: MUTED, marginTop: 8, marginBottom: 3 },
  row: { flexDirection: "row", paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: LINE },
  headRow: { flexDirection: "row", paddingVertical: 3, backgroundColor: "#f2f1ed" },
  totalRow: { flexDirection: "row", paddingVertical: 4, borderTopWidth: 1, borderTopColor: INK },
  cell: { paddingHorizontal: 3 },
  headCell: { paddingHorizontal: 3, fontSize: 8, fontWeight: 700, color: MUTED },
  right: { textAlign: "right" },
  bold: { fontWeight: 700 },
  muted: { color: MUTED },
  empty: { color: MUTED, fontStyle: "normal", paddingVertical: 4 },
  note: { fontSize: 8, color: MUTED, marginTop: 4 },
  footer: { position: "absolute", left: 36, right: 36, bottom: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 6 },
  footerText: { fontSize: 7.5, color: MUTED },
  watermark: { fontSize: 8, color: "#a3a29c", textAlign: "right" },
  watermarkBrand: { fontWeight: 700, color: BRAND },
});

type Money = (n: number) => string;

function Table({ cols, head, right, children }: { cols: number[]; head: string[]; /** Indexes of right-aligned (numeric) columns. */ right: number[]; children: ReactNode }) {
  return (
    <View>
      {/* minPresenceAhead keeps the header from being stranded at the bottom of a page. */}
      <View style={s.headRow} wrap={false} minPresenceAhead={50}>
        {head.map((h, i) => (
          <Text key={i} style={[s.headCell, { flex: cols[i] }, ...(right.includes(i) ? [s.right] : [])]}>
            {h}
          </Text>
        ))}
      </View>
      {children}
    </View>
  );
}

function Empty({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

function CategoryTable({ rows, total, L, money }: { rows: StatementCategoryTotal[]; total: number; L: StatementLabels; money: Money }) {
  const { t } = L;
  return (
    <Table cols={[4, 1.4, 1.6]} right={[1, 2]} head={[t("colCategory"), t("colShare"), t("colAmount")]}>
      {rows.map((r) => (
        <View key={r.category} style={s.row} wrap={false}>
          <Text style={[s.cell, { flex: 4 }]}>{L.category(r.category)}</Text>
          <Text style={[s.cell, s.right, s.muted, { flex: 1.4 }]}>{formatNumber(Math.round(r.share), L.locale)}%</Text>
          <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(r.amount)}</Text>
        </View>
      ))}
      <View style={s.totalRow} wrap={false}>
        <Text style={[s.cell, s.bold, { flex: 5.4 }]}>{t("total")}</Text>
        <Text style={[s.cell, s.right, s.bold, { flex: 1.6 }]}>{money(total)}</Text>
      </View>
    </Table>
  );
}

function RowsTable({
  rows,
  total,
  L,
  money,
  showTo,
}: {
  rows: StatementRow[];
  total?: number;
  L: StatementLabels;
  money: Money;
  /** Show "wallet › destination" (for expenses that are debt-payoff transfers). */
  showTo?: boolean;
}) {
  const { t } = L;
  return (
    <Table cols={[1.2, 2, 2.2, 3, 1.6]} right={[4]} head={[t("colDate"), t("colCategory"), t("colWallet"), t("colNote"), t("colAmount")]}>
      {rows.map((r) => (
        <View key={r.id} style={s.row} wrap={false}>
          <Text style={[s.cell, { flex: 1.2 }]}>{formatDateShort(r.date, L.locale)}</Text>
          <Text style={[s.cell, { flex: 2 }]}>{L.category(r.category)}</Text>
          <Text style={[s.cell, { flex: 2.2 }]}>{showTo && r.toWalletName ? `${r.walletName} › ${r.toWalletName}` : r.walletName}</Text>
          <Text style={[s.cell, s.muted, { flex: 3 }]}>{r.note}</Text>
          <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(r.amount)}</Text>
        </View>
      ))}
      {total !== undefined && (
        <View style={s.totalRow} wrap={false}>
          <Text style={[s.cell, s.bold, { flex: 8.4 }]}>{t("total")}</Text>
          <Text style={[s.cell, s.right, s.bold, { flex: 1.6 }]}>{money(total)}</Text>
        </View>
      )}
    </Table>
  );
}

function WalletLines({ lines, L, money, addedLabel, reducedLabel, closingLabel }: { lines: StatementWalletLine[]; L: StatementLabels; money: Money; addedLabel: string; reducedLabel: string; closingLabel: string }) {
  const { t } = L;
  return (
    <Table cols={[3, 1.6, 1.6, 1.6, 1.6]} right={[1, 2, 3, 4]} head={[t("colWallet"), t("colOpening"), addedLabel, reducedLabel, closingLabel]}>
      {lines.map((l) => (
        <View key={l.id} style={s.row} wrap={false}>
          <Text style={[s.cell, { flex: 3 }]}>{l.name}</Text>
          <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(l.opening)}</Text>
          <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(l.added)}</Text>
          <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(l.reduced)}</Text>
          <Text style={[s.cell, s.right, s.bold, { flex: 1.6 }]}>{money(l.closing)}</Text>
        </View>
      ))}
    </Table>
  );
}

function LoanSection({ kind, data, L, money }: { kind: "lend" | "debt"; data: StatementLoanSection; L: StatementLabels; money: Money }) {
  const { t } = L;
  const increase = kind === "lend" ? t("lendIncrease") : t("debtIncrease");
  const decrease = kind === "lend" ? t("lendDecrease") : t("debtDecrease");
  return (
    <View style={s.section}>
      {data.wallets.length === 0 ? (
        <View wrap={false}>
          <Text style={s.sectionTitle}>{kind === "lend" ? t("lendSection") : t("debtSection")}</Text>
          <Empty text={kind === "lend" ? t("noLend") : t("noDebt")} />
        </View>
      ) : (
        <>
          <View wrap={false}>
          <Text style={s.sectionTitle}>{kind === "lend" ? t("lendSection") : t("debtSection")}</Text>
          <WalletLines
            lines={data.wallets}
            L={L}
            money={money}
            addedLabel={increase}
            reducedLabel={decrease}
            closingLabel={kind === "lend" ? t("stillOwedToYou") : t("stillOwed")}
          />
          <View style={s.totalRow} wrap={false}>
            <Text style={[s.cell, s.bold, { flex: 8.4 }]}>{kind === "lend" ? t("totalOwedToYou") : t("totalOwed")}</Text>
            <Text style={[s.cell, s.right, s.bold, { flex: 1.6 }]}>{money(data.outstanding)}</Text>
          </View>
          </View>
          {data.movements.length > 0 && (
            <>
              <Text style={s.subTitle}>{t("movements")}</Text>
              <Table cols={[1.2, 2.4, 2.4, 2.2, 1.8]} right={[4]} head={[t("colDate"), t("colWallet"), t("colType"), t("colNote"), t("colAmount")]}>
                {data.movements.map((m) => (
                  <View key={m.id} style={s.row} wrap={false}>
                    <Text style={[s.cell, { flex: 1.2 }]}>{formatDateShort(m.date, L.locale)}</Text>
                    <Text style={[s.cell, { flex: 2.4 }]}>{m.walletName}</Text>
                    <Text style={[s.cell, { flex: 2.4, color: m.direction === "increase" ? BAD : GOOD }]}>
                      {m.direction === "increase" ? increase : decrease}
                      {m.counterpartName ? ` · ${m.counterpartName}` : ""}
                    </Text>
                    <Text style={[s.cell, s.muted, { flex: 2.2 }]}>{m.note}</Text>
                    <Text style={[s.cell, s.right, { flex: 1.8 }]}>{money(m.amount)}</Text>
                  </View>
                ))}
              </Table>
            </>
          )}
        </>
      )}
    </View>
  );
}

export function StatementDocument({ statement: d, labels: L }: { statement: MonthlyStatement; labels: StatementLabels }) {
  const { t } = L;
  const money: Money = (n) => formatCurrency(n, d.currency, L.locale);
  const period = `${monthLabel(d.month, L.locale)} ${formatYear(d.year, L.locale)}`;
  const generated = formatDate(new Date().toISOString().slice(0, 10), L.locale);

  const tiles: { label: string; value: string; color?: string }[] = [
    { label: t("income"), value: money(d.summary.income), color: GOOD },
    { label: t("expense"), value: money(d.summary.expense), color: BAD },
    { label: t("net"), value: money(d.summary.net), color: d.summary.net >= 0 ? GOOD : BAD },
    { label: t("liquidOpening"), value: money(d.summary.liquidOpening) },
    { label: t("liquidClosing"), value: money(d.summary.liquidClosing) },
  ];

  return (
    <Document title={`${t("title")} — ${period}`} author="Extrack" creator="Extrack" producer="Extrack">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Extrack</Text>
            <Text style={s.title}>{t("title")}</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{period}</Text>
          </View>
          <View>
            <Text style={s.meta}>{t("preparedFor", { name: d.userName })}</Text>
            <Text style={s.meta}>{t("generatedOn", { date: generated })}</Text>
            <Text style={s.meta}>{t("transactionCount", { count: formatNumber(d.summary.transactionCount, L.locale) })}</Text>
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
          <Text style={s.sectionTitle} minPresenceAhead={70}>{t("incomeSection")}</Text>
          {d.income.rows.length === 0 ? (
            <Empty text={t("noIncome")} />
          ) : (
            <>
              <Text style={s.subTitle}>{t("byCategory")}</Text>
              <CategoryTable rows={d.income.byCategory} total={d.income.total} L={L} money={money} />
              <Text style={s.subTitle}>{t("allTransactions")}</Text>
              <RowsTable rows={d.income.rows} L={L} money={money} />
            </>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle} minPresenceAhead={70}>{t("expenseSection")}</Text>
          {d.expenses.rows.length === 0 ? (
            <Empty text={t("noExpense")} />
          ) : (
            <>
              <Text style={s.subTitle}>{t("byCategory")}</Text>
              <CategoryTable rows={d.expenses.byCategory} total={d.expenses.total} L={L} money={money} />
              <Text style={s.subTitle}>{t("allTransactions")}</Text>
              <RowsTable rows={d.expenses.rows} L={L} money={money} showTo />
              <Text style={s.note}>{t("debtPaymentNote")}</Text>
            </>
          )}
        </View>

        <LoanSection kind="lend" data={d.lend} L={L} money={money} />
        <LoanSection kind="debt" data={d.debt} L={L} money={money} />

        {d.transfers.rows.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle} minPresenceAhead={70}>{t("transfersSection")}</Text>
            <RowsTable rows={d.transfers.rows} L={L} money={money} showTo />
            <Text style={s.note}>{t("transfersNote")}</Text>
          </View>
        )}

        {d.wallets.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle} minPresenceAhead={70}>{t("walletsSection")}</Text>
            <Table cols={[3, 1.4, 1.6, 1.6, 1.6, 1.6]} right={[2, 3, 4, 5]} head={[t("colWallet"), t("colType"), t("colOpening"), t("colAdded"), t("colReduced"), t("colClosing")]}>
              {d.wallets.map((w) => (
                <View key={w.id} style={s.row} wrap={false}>
                  <Text style={[s.cell, { flex: 3 }]}>{w.name}</Text>
                  <Text style={[s.cell, s.muted, { flex: 1.4 }]}>{L.walletType(w.type)}</Text>
                  <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(w.opening)}</Text>
                  <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(w.added)}</Text>
                  <Text style={[s.cell, s.right, { flex: 1.6 }]}>{money(w.reduced)}</Text>
                  <Text style={[s.cell, s.right, s.bold, { flex: 1.6 }]}>{money(w.closing)}</Text>
                </View>
              ))}
            </Table>
            <Text style={s.note}>{t("walletsNote")}</Text>
          </View>
        )}

        {/* Fixed › repeats on every page. Page counter bottom-left, watermark bottom-right. */}
        <View style={s.footer} fixed>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              t("pageOf", { page: formatNumber(pageNumber, L.locale), total: formatNumber(totalPages, L.locale) })
            }
          />
          <Text style={s.watermark}>
            {t("poweredBy")} <Text style={s.watermarkBrand}>Extrack</Text> × <Text style={s.watermarkBrand}>Astro</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
