import {
  type PaymentCard,
  CARD_COLOR_STYLES,
  formatMaskedCardNumber,
  networkLabel,
} from "./cardReturns";

interface Props {
  card: PaymentCard;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
}

export function CardVisual({
  card,
  selected,
  onClick,
  compact = false,
  onEdit,
  onDelete,
  onSetDefault,
}: Props) {
  const theme = CARD_COLOR_STYLES[card.card_color] ?? CARD_COLOR_STYLES.amber;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: selected ? "rgba(245, 184, 0, 0.15)" : "rgba(255, 255, 255, 0.04)",
          border: selected
            ? "1.5px solid var(--accent-500, #f5b800)"
            : "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: 14,
          padding: "8px 12px",
          color: "#ffffff",
          cursor: "pointer",
          transition: "all 0.15s ease",
          textAlign: "left",
          boxShadow: selected ? "0 4px 14px rgba(245, 184, 0, 0.25)" : "none",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 34,
            height: 22,
            borderRadius: 4,
            background: theme.background,
            border: `1px solid ${theme.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.6rem",
            fontWeight: 800,
            color: theme.accentColor,
            letterSpacing: 0.5,
          }}
        >
          {networkLabel(card.network).slice(0, 4)}
        </div>
        <div>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, lineHeight: 1.2 }}>
            {card.card_name}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--ink-muted, #a0a097)" }}>
            {card.bank_name} •••• {card.last_four}
          </div>
        </div>
        {card.is_default && (
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 800,
              background: "var(--accent-500, #f5b800)",
              color: "#000000",
              padding: "2px 6px",
              borderRadius: 6,
              marginLeft: 4,
            }}
          >
            DEFAULT
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        background: theme.background,
        border: selected ? "2px solid var(--accent-500, #f5b800)" : `1px solid ${theme.border}`,
        padding: "20px 22px",
        color: theme.textColor,
        boxShadow: selected
          ? "0 10px 30px rgba(245, 184, 0, 0.3)"
          : "0 8px 24px rgba(0, 0, 0, 0.4)",
        overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      {/* Decorative ambient glow circle */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: "50%",
          background: theme.accentColor,
          opacity: 0.12,
          pointerEvents: "none",
          filter: "blur(30px)",
        }}
      />

      {/* Top Header: Bank Name & Network */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: theme.accentColor,
            }}
          >
            {card.bank_name}
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 2 }}>
            {card.card_name}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {card.is_default && (
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                background: "rgba(245, 184, 0, 0.2)",
                color: "var(--accent-500, #f5b800)",
                border: "1px solid rgba(245, 184, 0, 0.4)",
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              ★ Default
            </span>
          )}
          <span
            style={{
              fontSize: "0.85rem",
              fontWeight: 900,
              letterSpacing: 1,
              padding: "4px 8px",
              borderRadius: 6,
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {networkLabel(card.network)}
          </span>
        </div>
      </div>

      {/* Chip and Contactless Graphics */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "22px 0 16px" }}>
        {/* Metallic Chip */}
        <div
          style={{
            width: 44,
            height: 32,
            borderRadius: 6,
            background: "linear-gradient(135deg, #d4af37 0%, #f6e27a 40%, #aa771c 100%)",
            border: "1px solid rgba(0, 0, 0, 0.3)",
            position: "relative",
            boxShadow: "inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)",
          }}
        >
          {/* Chip line dividers */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: 1,
              background: "rgba(0, 0, 0, 0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "40%",
              width: 1,
              background: "rgba(0, 0, 0, 0.25)",
            }}
          />
        </div>

        {/* Contactless waves SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.65 }}>
          <path d="M7 16a6 6 0 0 1 0-8" />
          <path d="M11 19a10 10 0 0 1 0-14" />
          <path d="M15 22a14 14 0 0 1 0-20" />
        </svg>
      </div>

      {/* Masked Card Number */}
      <div
        style={{
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "1.25rem",
          fontWeight: 700,
          letterSpacing: 3,
          color: "#f5f5f5",
          marginBottom: 16,
          textShadow: "0 2px 4px rgba(0, 0, 0, 0.6)",
        }}
      >
        {formatMaskedCardNumber(card.last_four)}
      </div>

      {/* Reward & Returns Badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: (onEdit || onDelete || onSetDefault) ? 14 : 0 }}>
        {card.fuel_cashback_percent > 0 && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
              background: "rgba(245, 184, 0, 0.15)",
              color: "var(--accent-500, #f5b800)",
              border: "1px solid rgba(245, 184, 0, 0.3)",
            }}
          >
            ⛽ {card.fuel_cashback_percent}% {card.partner_fuel_brand !== "all" && card.partner_fuel_brand !== "none" ? card.partner_fuel_brand.toUpperCase() : "Fuel"}
          </span>
        )}

        {card.surcharge_waiver_percent > 0 && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
              background: "rgba(16, 185, 129, 0.15)",
              color: "#34d399",
              border: "1px solid rgba(16, 185, 129, 0.3)",
            }}
          >
            ⚡ {card.surcharge_waiver_percent}% Surcharge Waived (₹{card.surcharge_min_amount}–₹{card.surcharge_max_amount})
          </span>
        )}

        {card.other_cashback_percent > 0 && (
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "3px 9px",
              borderRadius: 999,
              background: "rgba(99, 102, 241, 0.15)",
              color: "#a5b4fc",
              border: "1px solid rgba(99, 102, 241, 0.3)",
            }}
          >
            🔧 {card.other_cashback_percent}% Maintenance / Spares
          </span>
        )}
      </div>

      {/* Card Action Controls (Edit / Set Default / Delete) */}
      {(onEdit || onDelete || onSetDefault) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 10,
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: 12,
            marginTop: 4,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onSetDefault && !card.is_default && (
            <button
              type="button"
              onClick={onSetDefault}
              style={{
                background: "transparent",
                border: 0,
                color: "var(--accent-500, #f5b800)",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                padding: "4px 8px",
              }}
            >
              Make Default
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 8,
                color: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "5px 12px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                background: "rgba(244, 63, 94, 0.15)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: 8,
                color: "#fb7185",
                fontSize: "0.8rem",
                fontWeight: 600,
                padding: "5px 12px",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
