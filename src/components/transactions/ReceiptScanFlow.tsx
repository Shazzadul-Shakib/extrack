"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AlertCircle, Camera, ChevronDown, Flashlight, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { createReceiptTransactionsAction, type CreateReceiptTransactionsState } from "@/app/actions/receipts";
import { reencodeReceiptImage } from "@/lib/receiptImage";
import { RECEIPT_CATEGORY_NAMES } from "@/lib/llm/prompt";
import { Button, Field, Input, Select } from "@/components/ui";
import { cx } from "@/components/cx";
import { todayIso, walletBalanceLabel } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import type { ExtractReceiptResult } from "@/lib/llm/types";

const initialState: CreateReceiptTransactionsState = {};

interface EditableItem {
  id: string;
  label: string;
  amount: number;
}

interface EditableGroup {
  id: string;
  category: string;
  amount: number;
  date: string;
  note: string;
  items: EditableItem[];
  itemsOpen: boolean;
}

let localIdCounter = 0;
function localId(): string {
  localIdCounter += 1;
  return `local_${localIdCounter}`;
}

function joinLabels(items: { label: string }[]): string {
  return items.map((item) => item.label.trim()).filter(Boolean).join(", ");
}

function toEditableGroups(result: ExtractReceiptResult): EditableGroup[] {
  const date = result.date && !Number.isNaN(Date.parse(result.date)) ? result.date : todayIso();
  return result.groups.map((g) => ({
    id: localId(),
    category: g.category,
    amount: g.amount,
    date,
    note: g.items.length > 0 ? joinLabels(g.items) : g.note,
    items: g.items.map((item) => ({ id: localId(), label: item.label, amount: item.amount })),
    itemsOpen: false,
  }));
}

interface ItemRow {
  id: string;
  category: string;
  amount: number;
  date: string;
  note: string;
}

type SaveMode = "unified" | "perItem";

type ScanState = "pick" | "camera" | "preview" | "uploading" | "review" | "error";
type ScanErrorKind = "no_provider" | "invalid_key" | "rate_limited" | "quota_exceeded" | "other";

export function ReceiptScanFlow({
  wallets,
  defaultWalletId,
  onSuccess,
}: {
  wallets: Wallet[];
  defaultWalletId?: string;
  onSuccess?: () => void;
}) {
  const t = useTranslations("Transactions");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("Categories");
  const tWallets = useTranslations("Wallets");
  const locale = useLocale();
  const fileInputId = useId();
  const cameraInputId = useId();
  const retryUploadInputId = useId();
  const lastSourceRef = useRef<"camera" | "upload">("upload");

  const [scanState, setScanState] = useState<ScanState>("pick");
  const [errorKind, setErrorKind] = useState<ScanErrorKind>("other");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<string | null>(null);
  const [groups, setGroups] = useState<EditableGroup[]>([]);
  const [saveMode, setSaveMode] = useState<SaveMode>("unified");
  const [itemRows, setItemRows] = useState<ItemRow[]>([]);
  const [walletId, setWalletId] = useState(defaultWalletId ?? wallets[0]?.id ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFallbackInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string; viaLiveCamera: boolean } | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const [state, formAction, pending] = useActionState(createReceiptTransactionsAction, initialState);

  const previewUrlRef = useRef<string | null>(null);
  useEffect(() => {
    previewUrlRef.current = preview?.url ?? null;
  }, [preview]);
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    if (state.success) onSuccess?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  // Owns the webcam stream for the whole time scanState === "camera" — acquires it once the
  // <video> element is mounted, and always stops every track on cleanup (state change or
  // unmount) so the browser's camera-in-use indicator turns off promptly.
  useEffect(() => {
    if (scanState !== "camera") return;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 3840 },
          height: { ideal: 2160 },
        },
        audio: false,
      })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // Best-effort: continuous autofocus/exposure/white balance help text stay sharp. These
        // aren't in the standard TS types and are unsupported on some browsers, so failures are ignored.
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as Record<string, unknown>;
        const advanced: Record<string, unknown> = {};
        const has = (key: string, value: string) => Array.isArray(caps[key]) && (caps[key] as string[]).includes(value);
        if (has("focusMode", "continuous")) advanced.focusMode = "continuous";
        if (has("exposureMode", "continuous")) advanced.exposureMode = "continuous";
        if (has("whiteBalanceMode", "continuous")) advanced.whiteBalanceMode = "continuous";
        if (Object.keys(advanced).length > 0) {
          await track.applyConstraints({ advanced: [advanced] } as MediaTrackConstraints).catch(() => {});
        }
        if (!cancelled) setTorchSupported("torch" in caps);
      })
      .catch(() => {
        if (cancelled) return;
        setCameraError(t("cameraUnavailable"));
        setScanState("pick");
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setTorchSupported(false);
      setTorchOn(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanState]);

  async function handleTakePhotoClick() {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      // No in-browser camera API available (very old browser, or a non-secure context) — fall
      // back to the OS file/camera picker, which is the best this environment can offer.
      cameraFallbackInputRef.current?.click();
      return;
    }
    setScanState("camera");
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }

  function showPreview(file: File, viaLiveCamera: boolean) {
    setPreview({ file, url: URL.createObjectURL(file), viaLiveCamera });
    setScanState("preview");
  }

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  function retake() {
    const viaLiveCamera = preview?.viaLiveCamera ?? false;
    clearPreview();
    if (cameraFallbackInputRef.current) cameraFallbackInputRef.current.value = "";
    setScanState(viaLiveCamera ? "camera" : "pick");
  }

  function usePreviewPhoto() {
    if (!preview) return;
    const { file } = preview;
    clearPreview();
    void handleFile(file, "camera");
  }

  function closeCamera() {
    setScanState("pick");
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        showPreview(new File([blob], "camera-capture.jpg", { type: "image/jpeg" }), true);
      },
      "image/jpeg",
      0.95
    );
  }

  async function handleFile(file: File, source: "camera" | "upload" = "upload") {
    lastSourceRef.current = source;
    setScanState("uploading");
    try {
      const upload = await reencodeReceiptImage(file);
      const formData = new FormData();
      formData.set("image", upload);
      const res = await fetch("/api/receipts/extract", { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "unknown_error" }));
        if (body.error === "no_provider_configured") setErrorKind("no_provider");
        else if (body.error === "invalid_key") setErrorKind("invalid_key");
        else if (body.error === "rate_limited") setErrorKind("rate_limited");
        else if (body.error === "quota_exceeded") setErrorKind("quota_exceeded");
        else setErrorKind("other");
        setScanState("error");
        return;
      }
      const result: ExtractReceiptResult = await res.json();
      setMerchant(result.merchant);
      setGroups(toEditableGroups(result));
      setScanState("review");
    } catch {
      setErrorKind("other");
      setScanState("error");
    }
  }

  function updateGroup(id: string, patch: Partial<EditableGroup>) {
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  function removeGroup(id: string) {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  }

  // Per-item rows are flattened from the category groups each time the mode is entered, so
  // they start from the latest unified edits and are then edited independently.
  function switchMode(mode: SaveMode) {
    if (mode === saveMode) return;
    if (mode === "perItem") {
      setItemRows(
        groups.flatMap((g) =>
          g.items.length > 0
            ? g.items.map((it) => ({ id: localId(), category: g.category, amount: it.amount, date: g.date, note: it.label }))
            : [{ id: localId(), category: g.category, amount: g.amount, date: g.date, note: g.note }]
        )
      );
    }
    setSaveMode(mode);
  }

  function updateRow(id: string, patch: Partial<ItemRow>) {
    setItemRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setItemRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow() {
    setItemRows((prev) => [
      ...prev,
      { id: localId(), category: RECEIPT_CATEGORY_NAMES[0], amount: 0, date: todayIso(), note: "" },
    ]);
  }

  function addGroup() {
    setGroups((prev) => [
      ...prev,
      { id: localId(), category: RECEIPT_CATEGORY_NAMES[0], amount: 0, date: todayIso(), note: "", items: [], itemsOpen: false },
    ]);
  }

  function updateItem(groupId: string, itemId: string, patch: Partial<EditableItem>) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const items = g.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it));
        const amount = items.reduce((sum, it) => sum + (Number.isFinite(it.amount) ? it.amount : 0), 0);
        return { ...g, items, amount };
      })
    );
  }

  function removeItem(groupId: string, itemId: string) {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const items = g.items.filter((it) => it.id !== itemId);
        const amount = items.length > 0 ? items.reduce((sum, it) => sum + it.amount, 0) : g.amount;
        // Keep the auto-generated item list in sync unless the user has rewritten the note.
        const note = g.note === joinLabels(g.items) ? joinLabels(items) : g.note;
        return { ...g, items, amount, note };
      })
    );
  }

  function reset() {
    setScanState("pick");
    setGroups([]);
    setMerchant(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraFallbackInputRef.current) cameraFallbackInputRef.current.value = "";
  }

  if (scanState === "pick") {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-text-muted">
          <Camera className="h-7 w-7" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary">{t("scanReceiptTitle")}</p>
          <p className="mt-1 max-w-xs text-[13px] text-text-muted">{t("choosePhotoDesc")}</p>
        </div>
        {cameraError && (
          <p role="alert" className="flex max-w-xs items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
            {cameraError}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <input
            ref={cameraFallbackInputRef}
            id={cameraInputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) showPreview(file, false);
            }}
          />
          <button
            type="button"
            onClick={handleTakePhotoClick}
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-contrast hover:bg-brand-strong"
          >
            <Camera className="h-4 w-4" strokeWidth={2} />
            {t("takePhoto")}
          </button>
          <label htmlFor={fileInputId}>
            <input
              ref={fileInputRef}
              id={fileInputId}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <span className={cx("inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-text-primary hover:bg-surface-2")}>
              <ImagePlus className="h-4 w-4" strokeWidth={2} />
              {t("choosePhoto")}
            </span>
          </label>
        </div>
      </div>
    );
  }

  if (scanState === "camera") {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="aspect-[3/4] max-h-[65dvh] w-full overflow-hidden rounded-lg bg-black sm:aspect-[4/3] sm:max-h-none">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={closeCamera}>
            {tCommon("cancel")}
          </Button>
          <Button type="button" onClick={capturePhoto}>
            <Camera className="h-4 w-4" strokeWidth={2} />
            {t("capturePhoto")}
          </Button>
          {torchSupported && (
            <Button type="button" variant="outline" onClick={toggleTorch} aria-pressed={torchOn} aria-label="Flashlight">
              <Flashlight className="h-4 w-4" strokeWidth={2} />
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (scanState === "preview" && preview) {
    return (
      <div className="flex flex-col items-center gap-3 py-2">
        <div className="flex max-h-[65dvh] w-full items-center justify-center overflow-hidden rounded-lg bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.url} alt={t("previewAlt")} className="max-h-[65dvh] w-full object-contain" />
        </div>
        <p className="text-center text-[13px] text-text-muted">{t("previewHint")}</p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={retake}>
            <Camera className="h-4 w-4" strokeWidth={2} />
            {t("retakePhoto")}
          </Button>
          <Button type="button" onClick={usePreviewPhoto}>
            {t("usePhoto")}
          </Button>
        </div>
      </div>
    );
  }

  if (scanState === "uploading") {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" strokeWidth={2} />
        <p className="text-[13px] text-text-muted">{t("readingReceipt")}</p>
      </div>
    );
  }

  if (scanState === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <AlertCircle className="h-8 w-8 text-status-critical" strokeWidth={1.75} />
        <p className="max-w-xs text-[13px] text-text-secondary">
          {errorKind === "no_provider" && (
            <>
              {t("noProviderConfigured")}{" "}
              <Link href="/settings" className="font-medium text-brand hover:underline">
                {t("goToSettings")}
              </Link>
            </>
          )}
          {errorKind === "invalid_key" && (
            <>
              {t("invalidApiKey")}{" "}
              <Link href="/settings" className="font-medium text-brand hover:underline">
                {t("goToSettings")}
              </Link>
            </>
          )}
          {errorKind === "rate_limited" && t("rateLimited")}
          {errorKind === "quota_exceeded" && (
            <>
              {t("quotaExceeded")}{" "}
              <Link href="/settings" className="font-medium text-brand hover:underline">
                {t("goToSettings")}
              </Link>
            </>
          )}
          {errorKind === "other" && (lastSourceRef.current === "camera" ? t("cameraScanFailed") : t("genericScanError"))}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" onClick={reset}>
            {t("tryAgain")}
          </Button>
          {errorKind === "other" && lastSourceRef.current === "camera" ? (
            <label htmlFor={retryUploadInputId}>
              <input
                id={retryUploadInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file, "upload");
                }}
              />
              <span className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-brand-contrast hover:bg-brand-strong">
                <ImagePlus className="h-4 w-4" strokeWidth={2} />
                {t("uploadPhotoInstead")}
              </span>
            </label>
          ) : null}
        </div>
      </div>
    );
  }

  // review
  // "unified" logs one transaction per category (note lists its items); "perItem" logs every
  // line item as its own transaction under its category.
  const payload =
    saveMode === "perItem"
      ? itemRows.map((r) => ({ category: r.category, amount: r.amount, date: r.date, note: r.note }))
      : groups.map((g) => ({ category: g.category, amount: g.amount, date: g.date, note: g.note }));

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(e) => {
        if (payload.length === 0) e.preventDefault();
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="walletId" value={walletId} readOnly />
      <input
        type="hidden"
        name="groups"
        value={JSON.stringify(payload)}
        readOnly
      />

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1" role="group" aria-label={t("saveModeLabel")}>
        {(["unified", "perItem"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={saveMode === mode}
            onClick={() => switchMode(mode)}
            className={cx(
              "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              saveMode === mode ? "bg-surface text-text-primary shadow-sm" : "text-text-secondary hover:text-text-primary"
            )}
          >
            {mode === "unified" ? t("saveModeUnified") : t("saveModePerItem")}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-[12.5px] text-text-muted">
        {saveMode === "unified" ? t("saveModeUnifiedDesc") : t("saveModePerItemDesc")}
      </p>

      {merchant && <p className="text-[13px] text-text-muted">{t("merchantLabel", { merchant })}</p>}

      <Field label={t("walletLabel")} htmlFor="scan-walletId">
        <Select id="scan-walletId" value={walletId} onChange={(e) => setWalletId(e.target.value)} required>
          <option value="" disabled>
            {tCommon("chooseWallet")}
          </option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>{`${w.name} (${walletBalanceLabel(w, tWallets, locale)})`}</option>
          ))}
        </Select>
      </Field>

      {saveMode === "perItem" ? (
        <>
          <div className="flex flex-col gap-3">
            {itemRows.map((row) => (
              <div key={row.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <Input
                    type="text"
                    placeholder={t("itemNamePlaceholder")}
                    aria-label={t("itemName")}
                    value={row.note}
                    onChange={(e) => updateRow(row.id, { note: e.target.value })}
                    className="col-span-2"
                  />
                  <Select
                    aria-label={tCommon("category")}
                    value={row.category}
                    onChange={(e) => updateRow(row.id, { category: e.target.value })}
                  >
                    {RECEIPT_CATEGORY_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {tCategories(name)}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    aria-label={t("amount")}
                    value={row.amount}
                    onChange={(e) => updateRow(row.id, { amount: Number(e.target.value) })}
                  />
                  <Input
                    type="date"
                    max={todayIso()}
                    aria-label={t("date")}
                    value={row.date}
                    onChange={(e) => updateRow(row.id, { date: e.target.value })}
                    className="col-span-2"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label={t("removeGroup")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-status-critical"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
            {t("addItem")}
          </button>
        </>
      ) : (
        <>
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-2 gap-2">
                <Select
                  aria-label={tCommon("category")}
                  value={group.category}
                  onChange={(e) => updateGroup(group.id, { category: e.target.value })}
                >
                  {RECEIPT_CATEGORY_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {tCategories(name)}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  aria-label={t("amount")}
                  value={group.amount}
                  onChange={(e) => updateGroup(group.id, { amount: Number(e.target.value) })}
                />
                <Input
                  type="date"
                  max={todayIso()}
                  aria-label={t("date")}
                  value={group.date}
                  onChange={(e) => updateGroup(group.id, { date: e.target.value })}
                />
                <Input
                  type="text"
                  placeholder={t("descriptionPlaceholder")}
                  aria-label={t("description")}
                  value={group.note}
                  onChange={(e) => updateGroup(group.id, { note: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => removeGroup(group.id)}
                aria-label={t("removeGroup")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-2 hover:text-status-critical"
              >
                <Trash2 className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {group.items.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => updateGroup(group.id, { itemsOpen: !group.itemsOpen })}
                  className="flex items-center gap-1 text-[12.5px] font-medium text-text-muted hover:text-text-primary"
                >
                  <ChevronDown className={cx("h-3.5 w-3.5 transition-transform", group.itemsOpen && "rotate-180")} strokeWidth={2} />
                  {t("itemsLabel", { count: group.items.length })}
                </button>
                {group.itemsOpen && (
                  <ul className="mt-2 divide-y divide-border overflow-hidden rounded-lg bg-surface-2">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
                        <span className="min-w-0 flex-1 break-words text-[13px] leading-snug text-text-primary">{item.label}</span>
                        <div className="w-24 shrink-0">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            aria-label={item.label}
                            value={item.amount}
                            onChange={(e) => updateItem(group.id, item.id, { amount: Number(e.target.value) })}
                            className="h-8 px-2 text-right text-[13px] tabular-nums"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(group.id, item.id)}
                          aria-label={t("removeGroup")}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-status-critical"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addGroup}
        className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        {t("addGroup")}
      </button>
        </>
      )}

      {(state.error || state.fieldErrors?.groups || state.fieldErrors?.walletId) && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-status-critical-soft px-3 py-2 text-[13px] text-status-critical">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          {state.error ?? state.fieldErrors?.groups ?? state.fieldErrors?.walletId}
        </p>
      )}

      <Button type="submit" loading={pending} disabled={payload.length === 0 || !walletId} className="mt-1 self-end">
        {pending ? tCommon("saving") : t("createTransactionsCount", { count: payload.length })}
      </Button>
    </form>
  );
}
