"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducer } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { Delete, GripHorizontal, X } from "lucide-react";
import { cx } from "@/components/cx";

interface PanelPosition {
  left: number;
  top: number;
}

type Operator = "+" | "-" | "×" | "÷";

interface CalcState {
  display: string;
  pending: number | null;
  operator: Operator | null;
  overwrite: boolean;
}

type CalcAction =
  | { type: "digit"; digit: string }
  | { type: "decimal" }
  | { type: "operator"; operator: Operator }
  | { type: "equals" }
  | { type: "percent" }
  | { type: "clear" }
  | { type: "backspace" };

const initialCalcState: CalcState = { display: "0", pending: null, operator: null, overwrite: false };

function applyOperator(a: number, b: number, operator: Operator): number {
  switch (operator) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Error";
  return String(Math.round(value * 1e10) / 1e10);
}

function calcReducer(state: CalcState, action: CalcAction): CalcState {
  switch (action.type) {
    case "digit": {
      // "00" on a fresh/zero display stays a single "0" instead of stacking leading zeros.
      const digit = action.digit === "00" ? "0" : action.digit;
      if (state.overwrite || state.display === "0") {
        return { ...state, display: digit, overwrite: false };
      }
      if (state.display.replace("-", "").length + action.digit.length > 15) return state;
      return { ...state, display: state.display + action.digit };
    }
    case "decimal": {
      if (state.overwrite) return { ...state, display: "0.", overwrite: false };
      return state.display.includes(".") ? state : { ...state, display: state.display + "." };
    }
    case "operator": {
      const current = Number(state.display);
      if (state.operator && !state.overwrite && state.pending !== null) {
        const result = applyOperator(state.pending, current, state.operator);
        return { display: formatResult(result), pending: result, operator: action.operator, overwrite: true };
      }
      return { ...state, pending: current, operator: action.operator, overwrite: true };
    }
    case "equals": {
      if (state.operator === null || state.pending === null) return state;
      const result = applyOperator(state.pending, Number(state.display), state.operator);
      return { display: formatResult(result), pending: null, operator: null, overwrite: true };
    }
    case "percent": {
      return { ...state, display: formatResult(Number(state.display) / 100) };
    }
    case "clear":
      return initialCalcState;
    case "backspace": {
      if (state.overwrite) return state;
      const next = state.display.length > 1 ? state.display.slice(0, -1) : "0";
      return { ...state, display: next };
    }
  }
}

const noopSubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

const OPERATOR_KEYS: Record<string, Operator> = { "+": "+", "-": "-", "*": "×", "/": "÷" };

export function FloatingCalculator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("Calculator");
  const [state, dispatch] = useReducer(calcReducer, initialCalcState);
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  // Persists only for as long as the component stays mounted (the whole session, since
  // AppShell always renders it) — dragging to a spot and reopening keeps it there, but a full
  // page reload starts back at the default corner. No deliberate cross-reload persistence,
  // matching the rest of the widget.
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  function handleHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return; // let the close button work normally
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleHeaderPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const offset = dragOffsetRef.current;
    const panel = panelRef.current;
    if (!offset || !panel) return;
    const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
    setPosition({
      left: Math.min(Math.max(0, e.clientX - offset.x), maxLeft),
      top: Math.min(Math.max(0, e.clientY - offset.y), maxTop),
    });
  }

  function handleHeaderPointerUp() {
    dragOffsetRef.current = null;
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (/^[0-9]$/.test(e.key)) dispatch({ type: "digit", digit: e.key });
      else if (e.key === ".") dispatch({ type: "decimal" });
      else if (e.key in OPERATOR_KEYS) dispatch({ type: "operator", operator: OPERATOR_KEYS[e.key] });
      else if (e.key === "Enter" || e.key === "=") dispatch({ type: "equals" });
      else if (e.key === "Backspace") dispatch({ type: "backspace" });
      else if (e.key === "%") dispatch({ type: "percent" });
      else return;
      e.preventDefault();
    }

    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const keyClass =
    "flex h-11 items-center justify-center rounded-lg text-[15px] font-medium transition-colors hover:bg-surface-2";
  // The pending operator stays filled in until it's resolved, so it's obvious one is waiting.
  const opClass = (active: boolean) =>
    active ? "bg-brand text-brand-contrast hover:bg-brand-strong" : "bg-brand-soft text-brand";
  // "12 +" while waiting for the next number, "12 + 5" once it's being typed.
  const expression =
    state.operator !== null && state.pending !== null
      ? `${formatResult(state.pending)} ${state.operator}${state.overwrite ? "" : ` ${state.display}`}`
      : "";

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t("title")}
      className={cx(
        "fixed z-50 w-72 rounded-lg border border-border bg-surface p-3",
        position ? "" : "bottom-20 right-4 md:bottom-4 md:right-6"
      )}
      style={{ boxShadow: "var(--shadow-card)", ...(position ? { left: position.left, top: position.top } : {}) }}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        className="mb-2 flex touch-none items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
      >
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text-primary">
          <GripHorizontal className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={2} />
          {t("title")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text-primary"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-right">
        <div className="h-5 overflow-x-auto whitespace-nowrap text-[13px] tabular-nums text-text-muted" aria-live="polite">
          {expression}
        </div>
        <div className="overflow-x-auto text-2xl font-semibold tabular-nums text-text-primary">{state.display}</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button type="button" className={cx(keyClass, "text-status-critical")} onClick={() => dispatch({ type: "clear" })}>
          {t("clear")}
        </button>
        <button
          type="button"
          className={cx(keyClass, "flex items-center justify-center")}
          aria-label={t("backspace")}
          onClick={() => dispatch({ type: "backspace" })}
        >
          <Delete className="h-4.5 w-4.5" strokeWidth={2} />
        </button>
        <button type="button" className={keyClass} aria-label={t("percent")} onClick={() => dispatch({ type: "percent" })}>
          %
        </button>
        <button
          type="button"
          className={cx(keyClass, opClass(state.operator === "÷"))}
          aria-pressed={state.operator === "÷"}
          onClick={() => dispatch({ type: "operator", operator: "÷" })}
        >
          ÷
        </button>

        {["7", "8", "9"].map((d) => (
          <button key={d} type="button" className={cx(keyClass, "text-text-primary")} onClick={() => dispatch({ type: "digit", digit: d })}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={cx(keyClass, opClass(state.operator === "×"))}
          aria-pressed={state.operator === "×"}
          onClick={() => dispatch({ type: "operator", operator: "×" })}
        >
          ×
        </button>

        {["4", "5", "6"].map((d) => (
          <button key={d} type="button" className={cx(keyClass, "text-text-primary")} onClick={() => dispatch({ type: "digit", digit: d })}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={cx(keyClass, opClass(state.operator === "-"))}
          aria-pressed={state.operator === "-"}
          onClick={() => dispatch({ type: "operator", operator: "-" })}
        >
          −
        </button>

        {["1", "2", "3"].map((d) => (
          <button key={d} type="button" className={cx(keyClass, "text-text-primary")} onClick={() => dispatch({ type: "digit", digit: d })}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={cx(keyClass, opClass(state.operator === "+"))}
          aria-pressed={state.operator === "+"}
          onClick={() => dispatch({ type: "operator", operator: "+" })}
        >
          +
        </button>

        <button type="button" className={cx(keyClass, "text-text-primary")} onClick={() => dispatch({ type: "digit", digit: "0" })}>
          0
        </button>
        <button type="button" className={cx(keyClass, "text-text-primary")} onClick={() => dispatch({ type: "digit", digit: "00" })}>
          00
        </button>
        <button type="button" className={cx(keyClass, "text-text-primary")} onClick={() => dispatch({ type: "decimal" })}>
          .
        </button>
        <button
          type="button"
          aria-label={t("equals")}
          className={cx(keyClass, "bg-brand text-brand-contrast hover:opacity-90")}
          onClick={() => dispatch({ type: "equals" })}
        >
          =
        </button>
      </div>
    </div>,
    document.body,
  );
}
