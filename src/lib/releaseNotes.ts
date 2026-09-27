/**
 * The app's release history, shown on the "What's new" page. Newest first.
 *
 * To ship a new entry: bump the `version` in package.json, then add a new
 * object here at the top with the same version, today's date, and a short
 * English + Bengali summary of what changed.
 */
export interface ReleaseNote {
  version: string;
  date: string; // YYYY-MM-DD
  title: Record<"en" | "bn", string>;
  highlights: Record<"en" | "bn", string[]>;
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "0.7.0",
    date: "2026-09-27",
    title: { en: "Lending tracking", bn: "ধার দেওয়া ট্র্যাকিং" },
    highlights: {
      en: [
        "New Lending section, alongside Debts, for money you've lent to others.",
        "Pick the wallet money is lent from, and which wallet a repayment gets deposited into — nothing moves without a source or destination anymore.",
        "A lend wallet auto-archives once fully repaid, and its history stays filterable from the Lending page, same as Debts.",
        "Debts, Savings, and Lending now filter by wallet, date, and search only — the type/category dropdowns are gone from these pages since every row is already the same category.",
        "The dashboard's debt card is now a toggle, same as Net worth and Savings — switch between Total debt and Total lent without leaving the dashboard.",
        "Sidebar cleanup: What's new now sits right above your name, and Log out has a visible border.",
        "Fixed: Savings, Lending, and Debts hid their entire history whenever every wallet of that type had been deleted — even if it was deleted after years of transactions. History now stays visible for as long as it exists, independent of whether an active wallet is still around to show it.",
        "Fixed: a year could render with a stray comma in the middle (\"September 2,026\") anywhere a month/year label showed up — the dashboard header, the transactions and budgets month pickers, trend chart labels, and a budget's delete confirmation.",
        "This page — every release from here on will list what's new and what already exists.",
      ],
      bn: [
        "ঋণ সেকশনের পাশে একটি নতুন 'ধার দেওয়া' সেকশন — অন্যকে দেওয়া টাকা ট্র্যাক করার জন্য।",
        "কোন ওয়ালেট থেকে ধার দেওয়া হচ্ছে এবং ফেরত টাকা কোন ওয়ালেটে জমা হবে তা এখন বেছে নেওয়া যায় — উৎস বা গন্তব্য ছাড়া কোনো টাকা সরে না।",
        "সম্পূর্ণ ফেরত পেলে ধারের ওয়ালেট স্বয়ংক্রিয়ভাবে আর্কাইভ হয়ে যায়, এবং ঋণের মতোই এর ইতিহাস ফিল্টার করে দেখা যায়।",
        "ঋণ, সঞ্চয় ও ধার দেওয়া পেজে এখন শুধু ওয়ালেট, তারিখ ও সার্চ দিয়ে ফিল্টার করা যায় — ধরন/ক্যাটাগরি ড্রপডাউন সরিয়ে দেওয়া হয়েছে, যেহেতু পেজটি এমনিতেই একটি নির্দিষ্ট ক্যাটাগরির।",
        "ড্যাশবোর্ডের ঋণ কার্ডটি এখন নেট ওয়ার্থ ও সঞ্চয়ের মতোই টগল করা যায় — ড্যাশবোর্ড ছেড়ে না গিয়েই মোট ঋণ ও মোট ধার দেওয়ার মধ্যে সুইচ করুন।",
        "সাইডবার আরও গোছানো হয়েছে — 'নতুন কী' এখন আপনার নামের ঠিক উপরে, এবং লগ আউট বাটনে এখন একটি দৃশ্যমান বর্ডার আছে।",
        "সমাধান করা হয়েছে: সঞ্চয়, ধার দেওয়া ও ঋণ পেজে ওই ধরনের সব ওয়ালেট মুছে ফেলা হলে পুরো ইতিহাস লুকিয়ে যেত — এমনকি বছরের পর বছরের লেনদেনের পরও। এখন সক্রিয় ওয়ালেট থাকুক বা না থাকুক, ইতিহাস যতদিন আছে ততদিন দেখা যাবে।",
        "সমাধান করা হয়েছে: মাস/বছর লেখা থাকা যেকোনো জায়গায় বছরের মাঝে ভুলভাবে একটি কমা দেখা যেত (\"সেপ্টেম্বর ২,০২৬\") — ড্যাশবোর্ডের হেডার, লেনদেন ও বাজেট পেজের মাস নির্বাচক, ট্রেন্ড চার্টের লেবেল, এবং বাজেট মোছার নিশ্চিতকরণ বার্তায়।",
        "এই পেজ — এখন থেকে প্রতিটি রিলিজে নতুন ও বিদ্যমান ফিচারের তালিকা এখানে দেখা যাবে।",
      ],
    },
  },
  {
    version: "0.6.1",
    date: "2026-09-27",
    title: { en: "Copy budgets between months", bn: "মাসের মধ্যে বাজেট কপি" },
    highlights: {
      en: ["Copy every budgeted category from one month into another with one click, skipping categories the target month already has."],
      bn: ["এক ক্লিকে এক মাসের সব বাজেট করা ক্যাটাগরি অন্য মাসে কপি করুন — যেসব ক্যাটাগরিতে আগে থেকেই বাজেট আছে সেগুলো এড়িয়ে যাওয়া হয়।"],
    },
  },
  {
    version: "0.6.0",
    date: "2026-09-24",
    title: { en: "Bengali localization & BDT", bn: "বাংলা ভাষা ও টাকা" },
    highlights: {
      en: [
        "Full English + বাংলা UI, with real localized number, date, and currency formatting — not just translated strings.",
        "Wallets now default to BDT (৳) instead of USD.",
        "Per-locale SEO: sitemap, hreflang alternates, and Open Graph/Twitter metadata.",
      ],
      bn: [
        "সম্পূর্ণ ইংরেজি + বাংলা ইন্টারফেস, সংখ্যা, তারিখ ও মুদ্রার সঠিক স্থানীয় ফরম্যাটিং সহ — শুধু অনুবাদ নয়।",
        "নতুন ওয়ালেট এখন ডলারের বদলে ডিফল্টভাবে টাকায় (৳) তৈরি হয়।",
        "প্রতিটি ভাষার জন্য আলাদা সাইটম্যাপ ও মেটাডেটা যুক্ত হয়েছে।",
      ],
    },
  },
  {
    version: "0.5.2",
    date: "2026-09-13",
    title: { en: "Expense total fixes", bn: "খরচের হিসাব ঠিক করা হয়েছে" },
    highlights: {
      en: ["Fixed the expense stat card to correctly exclude money moved into savings."],
      bn: ["সঞ্চয়ে সরানো টাকা খরচের হিসাব থেকে ঠিকভাবে বাদ দেওয়ার সমস্যা সমাধান করা হয়েছে।"],
    },
  },
  {
    version: "0.5.1",
    date: "2026-09-11",
    title: { en: "Net worth toggle & comparisons", bn: "নেট ওয়ার্থ টগল ও তুলনা" },
    highlights: {
      en: [
        "Net worth stat card can toggle between including and excluding savings.",
        "Month-over-month income/expense filtering and comparison on the Transactions page.",
      ],
      bn: [
        "নেট ওয়ার্থ কার্ডে সঞ্চয় সহ বা বাদ দিয়ে দেখার টগল যুক্ত হয়েছে।",
        "লেনদেন পেজে মাস অনুযায়ী আয়/খরচ ফিল্টার ও তুলনা যুক্ত হয়েছে।",
      ],
    },
  },
  {
    version: "0.5.0",
    date: "2026-09-09",
    title: { en: "Budget comparison", bn: "বাজেট তুলনা" },
    highlights: {
      en: ["Compare a month's budget performance against any other month, side by side, with one click to swap which month is the base."],
      bn: ["এক ক্লিকে যেকোনো দুই মাসের বাজেটের পারফরম্যান্স পাশাপাশি তুলনা করুন।"],
    },
  },
  {
    version: "0.4.1",
    date: "2026-09-08",
    title: { en: "Wallet soft delete", bn: "ওয়ালেট সফট ডিলিট" },
    highlights: {
      en: ["Deleting a wallet now soft-deletes it — history stays intact — and only an empty wallet can be deleted."],
      bn: ["ওয়ালেট মুছে ফেলা এখন সফট ডিলিট — ইতিহাস অক্ষত থাকে — এবং শুধু খালি ওয়ালেট মুছে ফেলা যায়।"],
    },
  },
  {
    version: "0.4.0",
    date: "2026-09-06",
    title: { en: "Budgets", bn: "বাজেট" },
    highlights: {
      en: ["Set a monthly spending limit per category and track actual spend against it, with an over-budget state that reads clearly at a glance."],
      bn: ["প্রতি মাসে প্রতিটি ক্যাটাগরির জন্য একটি খরচের সীমা নির্ধারণ করুন এবং তার বিপরীতে প্রকৃত খরচ ট্র্যাক করুন।"],
    },
  },
  {
    version: "0.3.0",
    date: "2026-08-16",
    title: { en: "Pagination & filtering", bn: "পেজিনেশন ও ফিল্টার" },
    highlights: {
      en: ["Server-side pagination, a demo login, and filtering by type, category, wallet, and date range on the Transactions page."],
      bn: ["লেনদেন পেজে সার্ভার-সাইড পেজিনেশন, ডেমো লগইন, এবং ধরন/ক্যাটাগরি/ওয়ালেট/তারিখ অনুযায়ী ফিল্টার যুক্ত হয়েছে।"],
    },
  },
  {
    version: "0.2.0",
    date: "2026-08-11",
    title: { en: "Savings & Debts", bn: "সঞ্চয় ও ঋণ" },
    highlights: {
      en: ["Dedicated Savings and Debts wallet types and pages, each with the same stat-card + wallet-grid + history layout as the dashboard."],
      bn: ["আলাদা সঞ্চয় ও ঋণ ওয়ালেট ও পেজ যুক্ত হয়েছে, ড্যাশবোর্ডের মতোই স্ট্যাট কার্ড, ওয়ালেট গ্রিড ও ইতিহাস সহ।"],
    },
  },
  {
    version: "0.1.0",
    date: "2026-08-10",
    title: { en: "Initial release", bn: "প্রাথমিক সংস্করণ" },
    highlights: {
      en: ["Cash and Bank wallets, expense/income/transfer tracking, and a dashboard with income-vs-expense trends and spending-by-category."],
      bn: ["নগদ ও ব্যাংক ওয়ালেট, খরচ/আয়/স্থানান্তর ট্র্যাকিং, এবং আয়-বনাম-খরচ ট্রেন্ড ও ক্যাটাগরি অনুযায়ী খরচ সহ একটি ড্যাশবোর্ড।"],
    },
  },
];
