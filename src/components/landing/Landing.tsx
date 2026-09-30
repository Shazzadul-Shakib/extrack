import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarRange,
  Calculator,
  Check,
  ChevronDown,
  GitCompareArrows,
  HandCoins,
  Languages,
  LayoutDashboard,
  Megaphone,
  Receipt,
  ScanLine,
  ShieldCheck,
  Target,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logomark } from "@/components/Logomark";
import { LinkButton } from "@/components/ui";
import { SITE_URL } from "@/lib/siteUrl";

const FEATURES = [
  { key: "receipt", icon: ScanLine },
  { key: "wallets", icon: Wallet },
  { key: "transactions", icon: Receipt },
  { key: "dashboard", icon: LayoutDashboard },
  { key: "budgets", icon: Target },
  { key: "spending", icon: HandCoins },
  { key: "compare", icon: GitCompareArrows },
  { key: "filters", icon: CalendarRange },
  { key: "calculator", icon: Calculator },
  { key: "security", icon: ShieldCheck },
  { key: "languages", icon: Languages },
  { key: "updates", icon: Megaphone },
] as const satisfies readonly { key: string; icon: LucideIcon }[];

const RECEIPT_POINTS = [0, 1, 2, 3] as const;

const STEPS = ["one", "two", "three"] as const;
const FAQ = ["free", "ai", "devices", "currency", "privacy", "signIn", "lending"] as const;

/**
 * The public home page — what a search engine (or a first-time visitor) sees at `/en` and `/bn`.
 * A real page of crawlable text under a single h1, rather than a redirect to the login form.
 * Signed-in visitors never reach it: the route sends them straight to the dashboard.
 */
export async function Landing() {
  const [t, locale] = await Promise.all([getTranslations("Landing"), getLocale()]);
  const tCommon = await getTranslations("Common");

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Extrack",
    url: `${SITE_URL}/${locale}`,
    description: t("metaDescription"),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    inLanguage: ["en", "bn"],
    screenshot: `${SITE_URL}/screenshots/dashboard.png`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "BDT" },
  };

  return (
    <div className="flex min-h-screen flex-col bg-page text-text-primary">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logomark size="sm" />
            <span className="text-base font-semibold">{tCommon("brand")}</span>
          </Link>
          <nav aria-label={t("nav.label")} className="ml-6 hidden items-center gap-1 md:flex">
            {(
              [
                ["#features", t("nav.features")],
                ["#scan", t("nav.scan")],
                ["#how-it-works", t("nav.howItWorks")],
                ["#faq", t("nav.faq")],
              ] as const
            ).map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            {/* Wrapped, not classed on the button: the button's own `inline-flex` would beat `hidden`. */}
            <div className="hidden sm:block">
              <LinkButton href="/login" variant="ghost" size="sm" className="whitespace-nowrap">
                {t("nav.signIn")}
              </LinkButton>
            </div>
            <LinkButton href="/signup" size="sm" className="whitespace-nowrap">
              {t("nav.getStarted")}
            </LinkButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 pb-10 pt-14 md:px-6 md:pb-16 md:pt-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
            <span className="rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand">{t("hero.eyebrow")}</span>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-balance md:text-5xl md:leading-[1.1]">
              {t("hero.title")}
            </h1>
            <p className="max-w-2xl text-base text-text-secondary text-pretty md:text-lg">{t("hero.subtitle")}</p>
            <div className="mt-2 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
              <LinkButton href="/signup" size="lg" className="w-full sm:w-auto">
                {t("hero.primaryCta")}
              </LinkButton>
              <LinkButton href="/login" variant="outline" size="lg" className="w-full sm:w-auto">
                {t("hero.secondaryCta")}
              </LinkButton>
            </div>
            <p className="text-[13px] text-text-secondary">{t("hero.note")}</p>
          </div>

          <div
            className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-xl border border-border bg-surface"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Image
              src="/screenshots/dashboard.png"
              alt={t("hero.screenshotAlt")}
              width={1911}
              height={897}
              priority
              sizes="(min-width: 1024px) 1024px, 100vw"
              className="h-auto w-full"
            />
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-border bg-surface px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("featuresTitle")}</h2>
              <p className="mt-2 text-text-secondary">{t("featuresSubtitle")}</p>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ key, icon: Icon }) => (
                <li key={key} className="rounded-lg border border-border bg-page p-5">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <h3 className="text-[15px] font-semibold">{t(`features.${key}.title`)}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">{t(`features.${key}.desc`)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="scan" className="scroll-mt-20 border-t border-border px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand">{t("receipt.eyebrow")}</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance md:text-3xl">{t("receipt.title")}</h2>
              <p className="mt-2 text-text-secondary">{t("receipt.desc")}</p>
              <ul className="mt-6 flex flex-col gap-3">
                {RECEIPT_POINTS.map((i) => (
                  <li key={i} className="flex items-start gap-3 text-[14px] leading-relaxed text-text-secondary">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                    </span>
                    {t(`receipt.points.${i}`)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-surface" style={{ boxShadow: "var(--shadow-card)" }}>
              <Image
                src="/screenshots/receipt-scan.png"
                alt={t("receiptAlt")}
                width={1920}
                height={900}
                sizes="(min-width: 1024px) 560px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight md:text-3xl">{t("stepsTitle")}</h2>
            <ol className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {STEPS.map((key, i) => (
                <li key={key} className="flex flex-col items-center text-center md:items-start md:text-left">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-contrast" aria-hidden>
                    {i + 1}
                  </span>
                  <h3 className="text-[15px] font-semibold">{t(`steps.${key}.title`)}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-text-secondary">{t(`steps.${key}.desc`)}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 border-t border-border bg-surface px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight md:text-3xl">{t("faqTitle")}</h2>
            <div className="flex flex-col gap-3">
              {FAQ.map((key) => (
                <details key={key} className="group rounded-lg border border-border bg-page px-4 py-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                    {t(`faq.${key}.q`)}
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-muted transition-transform group-open:rotate-180" strokeWidth={2} aria-hidden />
                  </summary>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-text-secondary">{t(`faq.${key}.a`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 md:px-6 md:py-20">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t("ctaTitle")}</h2>
            <p className="text-text-secondary">{t("ctaDesc")}</p>
            <LinkButton href="/signup" size="lg" className="mt-2">
              {t("hero.primaryCta")}
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-surface px-4 py-8 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logomark size="sm" />
            <div>
              <p className="text-sm font-semibold">{tCommon("brand")}</p>
              <p className="text-[12.5px] text-text-secondary">{tCommon("tagline")}</p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-[13px] font-medium">
            <Link href="/login" className="text-text-secondary hover:text-text-primary">
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className="text-text-secondary hover:text-text-primary">
              {t("hero.primaryCta")}
            </Link>
          </nav>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </div>
  );
}
