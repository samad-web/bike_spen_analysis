import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import type { PaymentCard } from "./cardReturns";

export type CardInput = Omit<
  PaymentCard,
  "id" | "user_id" | "created_at" | "updated_at" | "deleted_at"
>;

const LOCAL_CARDS_KEY = "motopulse:cached_cards";

export function useCards() {
  const [cards, setCards] = useState<PaymentCard[]>(() => {
    try {
      const cached = localStorage.getItem(LOCAL_CARDS_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("payment_cards")
        .select("*")
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (err) throw err;
      const cardList = (data ?? []) as PaymentCard[];
      setCards(cardList);
      try {
        localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(cardList));
      } catch {
        /* ignore */
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addCard = useCallback(
    async (input: CardInput): Promise<{ card?: PaymentCard; error?: string }> => {
      try {
        const userRes = await supabase.auth.getUser();
        if (!userRes.data.user) throw new Error("Must be signed in to add a card");

        // If newly added card is default, unset any existing default card
        if (input.is_default) {
          await supabase
            .from("payment_cards")
            .update({ is_default: false })
            .eq("user_id", userRes.data.user.id);
        }

        const newCard = {
          ...input,
          user_id: userRes.data.user.id,
          last_four: input.last_four.trim().slice(-4),
        };

        const { data, error: insertErr } = await supabase
          .from("payment_cards")
          .insert(newCard)
          .select("*")
          .single();

        if (insertErr) throw insertErr;

        await refresh();
        return { card: data as PaymentCard };
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
    [refresh]
  );

  const updateCard = useCallback(
    async (id: string, patch: Partial<CardInput>): Promise<{ error?: string }> => {
      try {
        const userRes = await supabase.auth.getUser();
        if (!userRes.data.user) throw new Error("Must be signed in");

        if (patch.is_default) {
          await supabase
            .from("payment_cards")
            .update({ is_default: false })
            .eq("user_id", userRes.data.user.id);
        }

        const updateData = {
          ...patch,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from("payment_cards")
          .update(updateData)
          .eq("id", id);

        if (updateErr) throw updateErr;

        await refresh();
        return {};
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
    [refresh]
  );

  const deleteCard = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      try {
        const { error: delErr } = await supabase
          .from("payment_cards")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);

        if (delErr) throw delErr;

        await refresh();
        return {};
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
    [refresh]
  );

  const setDefaultCard = useCallback(
    async (id: string): Promise<{ error?: string }> => {
      return updateCard(id, { is_default: true });
    },
    [updateCard]
  );

  const defaultCard = cards.find((c) => c.is_default) ?? cards[0];

  return {
    cards,
    loading,
    error,
    refresh,
    addCard,
    updateCard,
    deleteCard,
    setDefaultCard,
    defaultCard,
  };
}
