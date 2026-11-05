import { useState } from "react";
import { Link } from "react-router-dom";
import { useCards } from "./useCards";
import { CardVisual } from "./CardVisual";
import { AddEditCardSheet } from "./AddEditCardSheet";
import type { PaymentCard } from "./cardReturns";
import { Card, Icon } from "@/app/ui";

export function CardsScreen() {
  const { cards, loading, error, addCard, updateCard, deleteCard, setDefaultCard } = useCards();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<PaymentCard | null>(null);

  const handleOpenAdd = () => {
    setEditingCard(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (card: PaymentCard) => {
    setEditingCard(card);
    setSheetOpen(true);
  };

  const handleDelete = async (card: PaymentCard) => {
    const ok = window.confirm(`Remove card "${card.card_name}" (ending in ${card.last_four})?`);
    if (ok) {
      await deleteCard(card.id);
    }
  };

  return (
    <div className="u-col u-gap-5">
      <header className="page-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Link to="/settings" style={{ color: "var(--ink-muted, #a0a097)", display: "flex", alignItems: "center" }}>
              <Icon name="arrow_left" size="sm" />
            </Link>
            <h1 style={{ margin: 0 }}>Payment Cards & Cashback</h1>
          </div>
          <p className="u-ink-muted u-text-sm">
            Save fuel cards to automatically calculate surcharge waivers & cashbacks at the pump.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            background: "var(--accent-500, #f5b800)",
            color: "#000000",
            border: 0,
            borderRadius: 999,
            padding: "8px 18px",
            fontWeight: 700,
            fontSize: "0.9rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 4px 14px rgba(245, 184, 0, 0.3)",
          }}
        >
          <Icon name="plus" size="sm" />
          <span>Add Card</span>
        </button>
      </header>

      {/* Guide Card explaining how fuel returns work */}
      <Card variant="dark">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(245, 184, 0, 0.15)",
              color: "var(--accent-500, #f5b800)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="card" size="md" />
          </div>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "1rem" }}>How Card Returns Work</h3>
            <p className="u-ink-muted u-text-sm" style={{ margin: 0, lineHeight: 1.5 }}>
              • <strong>1% Fuel Surcharge Waiver:</strong> Waived on transactions between ₹400 and ₹4,000.<br />
              • <strong>Fuel Returns:</strong> Co-branded cards like BPCL SBI Octane (6.25%), HPCL IDFC (5%), and IOCL Axis (4%) provide accelerated rewards.<br />
              • <strong>Privacy Guaranteed:</strong> Only your chosen nickname and the last 4 digits are stored. Full card numbers or CVV are never saved.
            </p>
          </div>
        </div>
      </Card>

      {/* Cards List */}
      {loading && cards.length === 0 ? (
        <p className="u-ink-muted u-text-sm">Loading cards…</p>
      ) : error && cards.length === 0 ? (
        <Card>
          <p role="alert" style={{ color: "var(--status-crit, #f43f5e)", margin: 0 }}>
            Failed to load cards: {error}
          </p>
        </Card>
      ) : cards.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>💳</div>
            <h3 style={{ margin: "0 0 6px" }}>No Payment Cards Added</h3>
            <p className="u-ink-muted u-text-sm" style={{ maxWidth: 360, margin: "0 auto 16px" }}>
              Add your fuel credit or debit card to see instant cashback and surcharge savings calculated every time you log fuel or maintenance.
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              style={{
                background: "var(--accent-500, #f5b800)",
                color: "#000000",
                border: 0,
                borderRadius: 999,
                padding: "10px 22px",
                fontWeight: 700,
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 6px 18px rgba(245, 184, 0, 0.35)",
              }}
            >
              Add Your First Card
            </button>
          </div>
        </Card>
      ) : (
        <div className="u-col u-gap-4">
          {cards.map((c) => (
            <CardVisual
              key={c.id}
              card={c}
              onEdit={() => handleOpenEdit(c)}
              onDelete={() => handleDelete(c)}
              onSetDefault={() => setDefaultCard(c.id)}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Modal Sheet */}
      {sheetOpen && (
        <AddEditCardSheet
          initialCard={editingCard}
          onSave={async (input) => {
            if (editingCard) {
              return updateCard(editingCard.id, input);
            } else {
              return addCard(input);
            }
          }}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
