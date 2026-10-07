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
    version: "1.1.0",
    date: "2026-10-07",
    title: { en: "Yearly view, isolated debts & lends, clearer history", bn: "বার্ষিক ভিউ, আলাদা ঋণ ও ধার, আরও স্পষ্ট ইতিহাস" },
    highlights: {
      en: [
        "New Monthly | Yearly toggle on the Dashboard. Yearly shows what you earned, spent and saved this year (with change vs. last year), plus spending by category for the whole year.",
        "The income vs. expense chart now has a third line for Saved, in both the monthly and yearly views. \"Saved\" follows the same rule as \"Saved this month\".",
        "Yearly statement on the Statement page: totals, a month-by-month table, spending by category for each month, income by source, cash and bank balances, and debt and lend summaries. Download it as a compact landscape PDF.",
        "In Settings, a saved API key now shows as a read-only masked field. Press Edit key to replace it, or Remove key — which asks you to confirm first.",
        "The dashboard chart now opens on This month by default instead of the last 6 months.",
        "Debt and lend wallets are now fully isolated: they no longer appear in the Add transaction form, and the Debt and Lend categories are gone from it. A debt is cleared and a loan repaid only from the Debts and Lend pages.",
        "Creating a debt wallet now shows a popup explaining that the borrowed money is now in your Cash wallet.",
        "The Debts, Lend and Savings pages show a proper history instead of a transaction list: when each wallet was opened and for what, every payment, repayment, deposit or withdrawal with the wallet on the other side, and the balance after each. It keeps the search, wallet and date filters and loads as you scroll. The Add transaction button is removed from these pages.",
        "A full-screen Extrack splash with a left-to-right progress bar now appears while the app loads, after sign-in and on reload.",
      ],
      bn: [
        "ড্যাশবোর্ডে নতুন মাসিক | বার্ষিক টগল। বার্ষিক ভিউতে এ বছর কত আয়, খরচ ও সঞ্চয় হয়েছে (গত বছরের তুলনাসহ) এবং পুরো বছরের ক্যাটাগরি অনুযায়ী খরচ দেখায়।",
        "আয় বনাম খরচ চার্টে এখন মাসিক ও বার্ষিক দুই ভিউতেই সঞ্চয়ের তৃতীয় লাইন আছে। \"সঞ্চয়\" গণনা \"এ মাসের সঞ্চয়\"-এর নিয়মেই হয়।",
        "স্টেটমেন্ট পেজে বার্ষিক স্টেটমেন্ট: মোট হিসাব, মাসভিত্তিক টেবিল, প্রতি মাসের ক্যাটাগরি অনুযায়ী খরচ, উৎস অনুযায়ী আয়, নগদ ও ব্যাংক ব্যালেন্স এবং ঋণ ও ধারের সারাংশ। সংক্ষিপ্ত ল্যান্ডস্কেপ পিডিএফ হিসেবে ডাউনলোড করা যায়।",
        "সেটিংসে সংরক্ষিত এপিআই কী এখন শুধু-পড়া মাস্ক করা ঘরে দেখায়। বদলাতে \"কী সম্পাদনা\" চাপুন, অথবা কী সরান — সরানোর আগে নিশ্চিত করতে বলা হবে।",
        "ড্যাশবোর্ডের চার্ট এখন ডিফল্টভাবে শেষ ৬ মাসের বদলে এ মাস দেখায়।",
        "ঋণ ও ধারের ওয়ালেট এখন সম্পূর্ণ আলাদা: লেনদেন যোগ করার ফর্মে এগুলো আর দেখা যায় না, আর সেখান থেকে ঋণ ও ধার ক্যাটাগরিও সরানো হয়েছে। ঋণ পরিশোধ ও ধার ফেরত নেওয়া শুধু ঋণ ও ধার পেজ থেকেই করা যায়।",
        "ঋণের ওয়ালেট বানালে এখন একটি পপআপে জানানো হয় যে ধার নেওয়া টাকা আপনার ক্যাশ ওয়ালেটে যোগ হয়েছে।",
        "ঋণ, ধার ও সঞ্চয় পেজে এখন লেনদেনের তালিকার বদলে সঠিক ইতিহাস দেখায়: প্রতিটি ওয়ালেট কবে ও কীসের জন্য খোলা হয়েছে, প্রতিটি পরিশোধ, ফেরত, জমা বা তোলা — অপর ওয়ালেটসহ — এবং প্রতিবারের পর ব্যালেন্স। সার্চ, ওয়ালেট ও তারিখ ফিল্টার আছে এবং স্ক্রল করলে আরও লোড হয়। এই পেজগুলো থেকে লেনদেন যোগ করার বাটন সরানো হয়েছে।",
        "অ্যাপ লোড হওয়ার সময়, সাইন-ইনের পরে ও রিলোডে এখন বাঁ থেকে ডানে প্রগ্রেস বারসহ পূর্ণ-স্ক্রিন Extrack স্প্ল্যাশ দেখায়।",
      ],
    },
  },
  {
    version: "0.11.0",
    date: "2026-10-04",
    title: { en: "Safer debts & a permanent Cash wallet", bn: "আরও নিরাপদ ঋণ ও স্থায়ী ক্যাশ ওয়ালেট" },
    highlights: {
      en: [
        "Borrowing money now lands in your Cash wallet. Create a debt wallet with an amount and that amount is added to Cash as income, noted \"From\" plus the debt name.",
        "If a fee or interest is taken up front, fill in \"Amount actually received\": Cash gets what you really received while the debt keeps the full amount you owe.",
        "Debt wallets are isolated — you can't spend from one, and a repayment can't be larger than what's still owed, so a debt can no longer go negative or drift when you use other wallets.",
        "Every account has one permanent wallet named Cash. It can't be deleted or renamed, it's restored automatically if it's ever missing, and no second wallet can be called Cash.",
        "New \"Opening balance for statement\" field when you create a cash, bank or savings wallet: it adds to the balance and appears in your statement as an Opening balance entry, without counting as income.",
        "Number inputs no longer show the up/down arrows, and the starting balance field starts empty instead of showing 0.",
      ],
      bn: [
        "ধার নেওয়া টাকা এখন আপনার ক্যাশ ওয়ালেটে যায়। পরিমাণসহ ঋণের ওয়ালেট বানালে সেই টাকা আয় হিসেবে ক্যাশে যোগ হয়, নোটে \"From\" ও ঋণের নাম লেখা থাকে।",
        "আগেই ফি বা সুদ কাটলে \"আসলে যা পেয়েছেন\" ঘরে তা লিখুন: ক্যাশে আসল প্রাপ্ত টাকা যোগ হবে, আর ঋণে পুরো বকেয়া থাকবে।",
        "ঋণের ওয়ালেট আলাদা থাকে — এখান থেকে খরচ করা যায় না, আর বকেয়ার চেয়ে বেশি পরিশোধ করা যায় না, তাই ঋণ আর মাইনাসে যায় না বা অন্য ওয়ালেটের কারণে এলোমেলো হয় না।",
        "প্রতিটি অ্যাকাউন্টে Cash নামে একটি স্থায়ী ওয়ালেট থাকে। এটি মোছা বা নাম বদলানো যায় না, হারিয়ে গেলে নিজে থেকে ফিরে আসে, আর অন্য কোনো ওয়ালেটের নাম Cash রাখা যায় না।",
        "ক্যাশ, ব্যাংক বা সঞ্চয় ওয়ালেট বানানোর সময় নতুন \"স্টেটমেন্টের জন্য শুরুর ব্যালেন্স\" ঘর: এটি ব্যালেন্সে যোগ হয় এবং স্টেটমেন্টে Opening balance হিসেবে দেখায়, আয় হিসেবে গণ্য হয় না।",
        "নম্বর ইনপুটে আর ওপর-নিচ তীর দেখায় না, আর শুরুর ব্যালেন্সের ঘর ০ না দেখিয়ে ফাঁকা থাকে।",
      ],
    },
  },
  {
    version: "0.10.0",
    date: "2026-10-01",
    title: { en: "Monthly PDF statements & a clearer calculator", bn: "মাসিক পিডিএফ স্টেটমেন্ট ও আরও স্পষ্ট ক্যালকুলেটর" },
    highlights: {
      en: [
        "Export any month as an organized PDF statement: a summary, income and expenses by category with every transaction, lend and debt activity with what's still owed, transfers, and each wallet's opening and closing balance.",
        "Preview the statement before you download it — pick a month on the new Statement page, check it, then download. Open it from the Dashboard or Transactions page.",
        "The statement follows your language, so in বাংলা you get Bangla text, numerals and dates. Every page carries a small \"Powered by Extrack × Astro\" mark at the bottom right.",
        "Lend and debt wallets that still carry a balance are included in the statement, even if nothing happened on them that month.",
        "Calculator: a new 00 key beside 0.",
        "Calculator: the + − × ÷ key you pressed now stays highlighted until the sum is resolved, and a small line above the display shows what's pending (like \"12 + 5\"), so you can always see which operation is waiting.",
      ],
      bn: [
        "যেকোনো মাসের হিসাব গুছানো পিডিএফ স্টেটমেন্ট হিসেবে এক্সপোর্ট করুন: সারসংক্ষেপ, ক্যাটাগরি অনুযায়ী আয় ও ব্যয় এবং প্রতিটি লেনদেন, ধার ও ঋণের লেনদেনসহ এখনও কত বাকি, স্থানান্তর, এবং প্রতিটি ওয়ালেটের শুরু ও শেষের ব্যালেন্স।",
        "ডাউনলোডের আগে স্টেটমেন্টের প্রিভিউ দেখুন — নতুন স্টেটমেন্ট পেজে মাস বেছে নিন, দেখে নিন, তারপর ডাউনলোড করুন। ড্যাশবোর্ড বা লেনদেন পেজ থেকে খোলা যায়।",
        "স্টেটমেন্ট আপনার ভাষা অনুসরণ করে, তাই বাংলায় বাংলা লেখা, অঙ্ক ও তারিখ পাবেন। প্রতিটি পৃষ্ঠার নিচে ডানদিকে ছোট করে \"চালিত: Extrack × Astro\" লেখা থাকে।",
        "যে ধার বা ঋণের ওয়ালেটে এখনও ব্যালেন্স আছে তা স্টেটমেন্টে থাকে, সেই মাসে কোনো লেনদেন না হলেও।",
        "ক্যালকুলেটর: ০-এর পাশে নতুন ০০ বোতাম।",
        "ক্যালকুলেটর: যে + − × ÷ চেপেছেন সেটি হিসাব শেষ না হওয়া পর্যন্ত হাইলাইট থাকে, আর ডিসপ্লের ওপরের ছোট লাইনে বাকি অপারেশনটি (যেমন \"12 + 5\") দেখায় — ফলে কোন অপারেশন অপেক্ষায় আছে তা সবসময় বোঝা যায়।",
      ],
    },
  },
  {
    version: "0.9.1",
    date: "2026-09-30",
    title: { en: "Better receipt scanning", bn: "আরও ভালো রসিদ স্ক্যানিং" },
    highlights: {
      en: [
        "Choose how scanned expenses are saved: by category (one expense per category) or per item (every item becomes its own expense).",
        "The description of each category is now the list of its items, separated by commas — so you can see exactly what you spent on. Adjust it before saving if you like.",
        "The receipt scanner now opens full screen on phones, with a taller camera view.",
        "Sharper scans: the camera uses higher resolution with continuous autofocus, there's a flashlight button on supported phones, and photos are sent at higher quality so small print is easier to read.",
        "After taking a photo you now see a preview first — retake it if it's blurry, or tap Use this photo to scan it.",
        "If a camera photo can't be read, you're now prompted to upload a photo instead, with the file picker one tap away.",
      ],
      bn: [
        "স্ক্যান করা খরচ কীভাবে সংরক্ষণ হবে তা বেছে নিন: ক্যাটাগরি অনুযায়ী (প্রতি ক্যাটাগরিতে একটি খরচ) অথবা আইটেম অনুযায়ী (প্রতিটি আইটেম আলাদা খরচ)।",
        "প্রতিটি ক্যাটাগরির বিবরণ এখন কমা দিয়ে আলাদা করা আইটেমের তালিকা — ফলে কীসে খরচ হয়েছে তা পরিষ্কার বোঝা যায়। সংরক্ষণের আগে চাইলে বদলে নিতে পারেন।",
        "রসিদ স্ক্যানার এখন ফোনে ফুল স্ক্রিনে খোলে, ক্যামেরা ভিউও আগের চেয়ে লম্বা।",
        "আরও স্পষ্ট স্ক্যান: ক্যামেরা এখন বেশি রেজোলিউশন ও অবিরাম অটোফোকাস ব্যবহার করে, সমর্থিত ফোনে ফ্ল্যাশলাইট বোতাম আছে, এবং ছবি উচ্চ মানে পাঠানো হয় যাতে ছোট লেখা সহজে পড়া যায়।",
        "ছবি তোলার পর এখন আগে প্রিভিউ দেখায় — ঝাপসা হলে আবার তুলুন, ঠিক থাকলে 'এই ছবিটি ব্যবহার করুন' চাপ দিন।",
        "ক্যামেরার ছবি পড়া না গেলে এখন ছবি আপলোড করার পরামর্শ দেখায়, আর ফাইল বাছাইয়ের অপশন এক ট্যাপ দূরে।",
      ],
    },
  },
  {
    version: "0.9.0",
    date: "2026-09-29",
    title: { en: "AI receipt scanning & a calculator", bn: "এআই রসিদ স্ক্যানিং ও ক্যালকুলেটর" },
    highlights: {
      en: [
        "Scan a bazar list or receipt — by camera or from a photo — and get expenses grouped by category, ready to review, edit, and confirm before anything is saved.",
        "New Settings page: your account info, plus a choice of AI provider — Claude, ChatGPT, or Gemini — with your own API key. Step-by-step instructions for getting a key from each one are built right in, including what a rate-limit or low-quota error means and how to fix it.",
        "Gemini needs no billing to use at all — the only one of the three that's free, with that trade-off (Google may use free-tier prompts to improve their products) spelled out up front.",
        "API keys are encrypted at rest and never sent back to the browser once saved. Receipt photos are never stored — they're used once to read the expenses off them, then discarded.",
        "A calculator, one click away from the header on every page — drag it anywhere on screen.",
      ],
      bn: [
        "ক্যামেরা দিয়ে বা ছবি থেকে বাজারের তালিকা বা রসিদ স্ক্যান করুন — খরচগুলো ক্যাটাগরি অনুযায়ী গুছিয়ে দেখানো হবে, আপনি পর্যালোচনা করে, প্রয়োজনে ঠিক করে, তারপর নিশ্চিত করলে সংরক্ষণ হবে।",
        "নতুন সেটিংস পেজ: আপনার অ্যাকাউন্টের তথ্য, এবং একটি এআই প্রোভাইডার বেছে নেওয়ার সুযোগ — Claude, ChatGPT, বা Gemini — নিজের এপিআই কী দিয়ে। প্রতিটি থেকে কী পাওয়ার ধাপে ধাপে নির্দেশনা এখানেই আছে, rate-limit বা কোটা শেষ হওয়ার ত্রুটি মানে কী এবং তা কীভাবে ঠিক করবেন তা-সহ।",
        "Gemini ব্যবহার করতে কোনো বিলিং লাগে না — তিনটির মধ্যে এটিই একমাত্র ফ্রি, এবং এর একটি শর্ত (Google ফ্রি-টায়ারের প্রম্পট তাদের প্রোডাক্ট উন্নত করতে ব্যবহার করতে পারে) স্পষ্টভাবে জানানো আছে।",
        "এপিআই কী এনক্রিপ্ট করে সংরক্ষণ করা হয় এবং সংরক্ষণের পর তা ব্রাউজারে আর কখনো ফেরত পাঠানো হয় না। রসিদের ছবি কখনোই সংরক্ষণ করা হয় না — শুধু একবার খরচ পড়ার জন্য ব্যবহার হয়ে সঙ্গে সঙ্গে বাদ দেওয়া হয়।",
        "প্রতিটি পেজের হেডার থেকে এক ক্লিকেই একটি ক্যালকুলেটর — স্ক্রিনের যেকোনো জায়গায় টেনে নিয়ে যান।",
      ],
    },
  },
  {
    version: "0.8.1",
    date: "2026-09-29",
    title: { en: "Forgot password", bn: "পাসওয়ার্ড ভুলে গেছেন" },
    highlights: {
      en: [
        "Forgot your password? Request a reset link from the sign-in page and choose a new one — the link expires in 1 hour and works only once.",
      ],
      bn: [
        "পাসওয়ার্ড ভুলে গেছেন? সাইন ইন পেজ থেকে একটি রিসেট লিংক চেয়ে নিন এবং নতুন পাসওয়ার্ড দিন — লিংকটি ১ ঘণ্টা পর্যন্ত কার্যকর এবং একবারই ব্যবহার করা যায়।",
      ],
    },
  },
  {
    version: "0.8.0",
    date: "2026-09-28",
    title: { en: "One expense total, sign-in upgrades & feature requests", bn: "একটি খরচের হিসাব, সাইন-ইন আপগ্রেড ও ফিচার অনুরোধ" },
    highlights: {
      en: [
        "Expenses now add up the same way everywhere. Paying off a debt, moving money into savings, and lending money out all count as spending — the dashboard cards, the spending chart, budgets, and the Transactions page now show identical totals.",
        "The Transactions summary shows what's inside the Expense total: Debt, Savings, and Lend, each on its own. Filtering by the Expense type includes them too.",
        "Browse any month's history on its own: a new month & year filter on Transactions (and Savings, Lending, Debts, and each wallet's history) with previous/next arrows and an All time reset.",
        "The dashboard's \"Expenses this month\" is no longer reduced when you spend straight out of savings or move money back out of it — that spending is real, so it stays counted. \"Saved this month\" still tracks your net savings.",
        "Suggest features and like the ideas you want most, right from a new Feature requests tab on this page.",
        "Sign in with Google.",
        "New accounts confirm their email address before their first sign-in. Existing accounts are unaffected.",
        "Fixed: picking a filter in the first moments after the Transactions page loaded could be silently undone.",
      ],
      bn: [
        "খরচ এখন সব জায়গায় একই নিয়মে যোগ হয়। ঋণ শোধ, সঞ্চয়ে টাকা সরানো এবং ধার দেওয়া — সবই খরচ হিসেবে গণ্য — ড্যাশবোর্ডের কার্ড, খরচের চার্ট, বাজেট এবং লেনদেন পেজে এখন একই মোট দেখায়।",
        "লেনদেনের সারসংক্ষেপে খরচের মোটের ভেতরে কী আছে তা দেখায়: ঋণ, সঞ্চয় ও ধার দেওয়া আলাদাভাবে। 'খরচ' ধরন দিয়ে ফিল্টার করলেও এগুলো আসে।",
        "যেকোনো মাসের ইতিহাস আলাদাভাবে দেখুন: লেনদেন (এবং সঞ্চয়, ধার দেওয়া, ঋণ ও প্রতিটি ওয়ালেটের ইতিহাস) পেজে নতুন মাস ও বছরের ফিল্টার — আগের/পরের তীর এবং 'সব সময়' রিসেট সহ।",
        "ড্যাশবোর্ডের 'এই মাসের খরচ' এখন আর কমে না যখন আপনি সরাসরি সঞ্চয় থেকে খরচ করেন বা সঞ্চয় থেকে টাকা ফিরিয়ে আনেন — সেই খরচ বাস্তব, তাই গণনায় থাকে। 'এই মাসে সঞ্চয়' আগের মতোই নিট সঞ্চয় দেখায়।",
        "এই পেজের নতুন ফিচার অনুরোধ ট্যাব থেকে ফিচারের প্রস্তাব দিন এবং যেগুলো সবচেয়ে বেশি চান সেগুলোতে লাইক দিন।",
        "গুগল দিয়ে সাইন ইন করুন।",
        "নতুন অ্যাকাউন্টকে প্রথমবার সাইন ইনের আগে ইমেইল ঠিকানা নিশ্চিত করতে হয়। বিদ্যমান অ্যাকাউন্টে কোনো পরিবর্তন নেই।",
        "সমাধান করা হয়েছে: লেনদেন পেজ লোড হওয়ার প্রথম মুহূর্তগুলোতে ফিল্টার বাছাই করলে তা নিজে থেকেই মুছে যেতে পারত।",
      ],
    },
  },
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
