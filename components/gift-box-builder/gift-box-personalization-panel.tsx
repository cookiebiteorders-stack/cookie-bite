"use client";

import { GIFT_BOX_BUILDER_DATA } from "@/lib/gift-box-builder/data";
import type { GiftBoxBuilderState } from "@/lib/gift-box-builder/types";

type Props = {
  state: GiftBoxBuilderState;
  onPatch: (partial: Partial<GiftBoxBuilderState>) => void;
  t: (key: string) => string;
};

export function GiftBoxPersonalizationPanel({ state, onPatch, t }: Props) {
  const { cardDesigns, ribbonColors, wrapStyles } = GIFT_BOX_BUILDER_DATA;

  return (
    <div className="gb-step-panel active">
      <h2 className="gb-step-title">{t("pages.giftBoxBuilder.s3Title")}</h2>
      <p className="gb-step-sub" style={{ marginBottom: 20 }}>
        {t("pages.giftBoxBuilder.s3Sub")}
      </p>

      <div className="gb-section-block">
        <p className="gb-section-label">{t("pages.giftBoxBuilder.wrapStyle")}</p>
        <div className="gb-option-grid" role="radiogroup" aria-label={t("pages.giftBoxBuilder.wrapStyle")}>
          {wrapStyles.map((wrap) => {
            const selected = state.wrapStyle === wrap.id;
            return (
              <button
                key={wrap.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`gb-option-chip${selected ? " selected" : ""}`}
                onClick={() => onPatch({ wrapStyle: wrap.id })}
              >
                <span className="gb-option-chip__swatch" style={{ background: wrap.color }} aria-hidden />
                <span className="gb-option-chip__icon" aria-hidden>
                  {wrap.icon}
                </span>
                <span className="gb-option-chip__label">{wrap.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="gb-section-block">
        <p className="gb-section-label">{t("pages.giftBoxBuilder.ribbonColor")}</p>
        <div className="gb-swatch-row" role="radiogroup" aria-label={t("pages.giftBoxBuilder.ribbonColor")}>
          {ribbonColors.map((ribbon) => {
            const selected = state.ribbonColor === ribbon.id;
            return (
              <button
                key={ribbon.id}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={ribbon.label}
                title={ribbon.label}
                className={`gb-swatch${selected ? " selected" : ""}`}
                style={{ background: ribbon.hex }}
                onClick={() => onPatch({ ribbonColor: ribbon.id })}
              />
            );
          })}
        </div>
      </div>

      <div className="gb-section-block">
        <p className="gb-section-label">{t("pages.giftBoxBuilder.cardDesign")}</p>
        <div className="gb-option-grid" role="radiogroup" aria-label={t("pages.giftBoxBuilder.cardDesign")}>
          {cardDesigns.map((card) => {
            const selected = state.cardDesign === card.id;
            return (
              <button
                key={card.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`gb-option-chip${selected ? " selected" : ""}`}
                onClick={() => onPatch({ cardDesign: card.id })}
              >
                <span className="gb-option-chip__swatch" style={{ background: card.color }} aria-hidden />
                <span className="gb-option-chip__label">{card.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="gb-section-block">
        <div className="gb-input-row">
          <label className="gb-field-label" htmlFor="gb-msg-to">
            {t("pages.giftBoxBuilder.to")}
          </label>
          <input
            id="gb-msg-to"
            className="gb-input"
            type="text"
            maxLength={60}
            placeholder={t("pages.giftBoxBuilder.to")}
            value={state.msgTo}
            onChange={(e) => onPatch({ msgTo: e.target.value })}
          />
        </div>
        <div className="gb-input-row" style={{ marginTop: 12 }}>
          <label className="gb-field-label" htmlFor="gb-msg-from">
            {t("pages.giftBoxBuilder.from")}
          </label>
          <input
            id="gb-msg-from"
            className="gb-input"
            type="text"
            maxLength={60}
            placeholder={t("pages.giftBoxBuilder.from")}
            value={state.msgFrom}
            onChange={(e) => onPatch({ msgFrom: e.target.value })}
          />
        </div>
        <label className="gb-field-label" htmlFor="gb-msg-text" style={{ marginTop: 16, display: "block" }}>
          {t("pages.giftBoxBuilder.message")}
        </label>
        <textarea
          id="gb-msg-text"
          className="gb-input"
          rows={4}
          maxLength={250}
          placeholder={t("pages.giftBoxBuilder.message")}
          value={state.msgText}
          onChange={(e) => onPatch({ msgText: e.target.value })}
        />
        <div className="text-end text-xs text-[var(--gb-text-muted)]">{state.msgText.length} / 250</div>
      </div>
    </div>
  );
}
