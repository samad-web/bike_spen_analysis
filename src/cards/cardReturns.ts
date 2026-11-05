export type CardNetwork = "visa" | "mastercard" | "rupay" | "amex" | "other";
export type CardColor = "amber" | "emerald" | "indigo" | "rose" | "slate" | "gold" | "purple" | "cyan";
export type FuelBrand = "all" | "bpcl" | "hpcl" | "iocl" | "shell" | "none";

export interface PaymentCard {
  id: string;
  user_id?: string;
  card_name: string;
  last_four: string;
  bank_name: string;
  network: CardNetwork;
  card_color: CardColor;
  fuel_cashback_percent: number;
  surcharge_waiver_percent: number;
  surcharge_min_amount: number;
  surcharge_max_amount: number;
  partner_fuel_brand: FuelBrand;
  other_cashback_percent: number;
  is_default: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CardReturnsResult {
  surchargeWaiver: number;
  cashbackAmount: number;
  totalSavings: number;
  effectiveRatePercent: number;
  breakdownText: string;
}

export interface CardPreset {
  id: string;
  label: string;
  bank_name: string;
  card_name: string;
  network: CardNetwork;
  card_color: CardColor;
  fuel_cashback_percent: number;
  surcharge_waiver_percent: number;
  surcharge_min_amount: number;
  surcharge_max_amount: number;
  partner_fuel_brand: FuelBrand;
  other_cashback_percent: number;
  description: string;
}

export const CARD_PRESETS: CardPreset[] = [
  {
    id: "bpcl_sbi_octane",
    label: "BPCL SBI Octane",
    bank_name: "SBI",
    card_name: "BPCL SBI Card Octane",
    network: "rupay",
    card_color: "amber",
    fuel_cashback_percent: 6.25,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 400,
    surcharge_max_amount: 4000,
    partner_fuel_brand: "bpcl",
    other_cashback_percent: 1.0,
    description: "6.25% value-back on BPCL fuel + 1% surcharge waiver (₹400–₹4,000)",
  },
  {
    id: "hpcl_idfc_power_plus",
    label: "HPCL IDFC Power+",
    bank_name: "IDFC FIRST",
    card_name: "HPCL First Power+",
    network: "rupay",
    card_color: "emerald",
    fuel_cashback_percent: 5.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 200,
    surcharge_max_amount: 5000,
    partner_fuel_brand: "hpcl",
    other_cashback_percent: 1.5,
    description: "5% savings on HPCL fuel & HP Pay + 1% surcharge waiver",
  },
  {
    id: "iocl_axis",
    label: "IndianOil Axis Bank",
    bank_name: "Axis Bank",
    card_name: "IndianOil Credit Card",
    network: "rupay",
    card_color: "indigo",
    fuel_cashback_percent: 4.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 400,
    surcharge_max_amount: 4000,
    partner_fuel_brand: "iocl",
    other_cashback_percent: 1.0,
    description: "4% value-back on IndianOil bunks + 1% surcharge waiver",
  },
  {
    id: "amazon_pay_icici",
    label: "Amazon Pay ICICI",
    bank_name: "ICICI Bank",
    card_name: "Amazon Pay ICICI",
    network: "visa",
    card_color: "gold",
    fuel_cashback_percent: 0.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 400,
    surcharge_max_amount: 4000,
    partner_fuel_brand: "all",
    other_cashback_percent: 1.0,
    description: "1% surcharge waiver on fuel, 1% flat unlimited on maintenance & parts",
  },
  {
    id: "sbi_cashback",
    label: "SBI Cashback Card",
    bank_name: "SBI",
    card_name: "Cashback SBI Card",
    network: "visa",
    card_color: "cyan",
    fuel_cashback_percent: 0.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 500,
    surcharge_max_amount: 3000,
    partner_fuel_brand: "all",
    other_cashback_percent: 5.0,
    description: "5% on online parts & maintenance orders, 1% fuel surcharge waiver",
  },
  {
    id: "axis_ace",
    label: "Axis Bank Ace",
    bank_name: "Axis Bank",
    card_name: "Axis Bank Ace",
    network: "visa",
    card_color: "slate",
    fuel_cashback_percent: 0.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 400,
    surcharge_max_amount: 4000,
    partner_fuel_brand: "all",
    other_cashback_percent: 1.5,
    description: "1.5% flat on offline maintenance/service, 1% fuel surcharge waiver",
  },
  {
    id: "custom",
    label: "Custom Card",
    bank_name: "Other",
    card_name: "My Credit Card",
    network: "visa",
    card_color: "purple",
    fuel_cashback_percent: 1.0,
    surcharge_waiver_percent: 1.0,
    surcharge_min_amount: 400,
    surcharge_max_amount: 4000,
    partner_fuel_brand: "all",
    other_cashback_percent: 1.0,
    description: "Custom cashback rates and surcharge waiver limits",
  },
];

export const CARD_COLOR_STYLES: Record<
  CardColor,
  { background: string; border: string; accentColor: string; textColor: string }
> = {
  amber: {
    background: "linear-gradient(135deg, #2b1f02 0%, #171101 50%, #4a3406 100%)",
    border: "rgba(245, 184, 0, 0.45)",
    accentColor: "#f5b800",
    textColor: "#ffffff",
  },
  emerald: {
    background: "linear-gradient(135deg, #022b17 0%, #01170c 50%, #064a2b 100%)",
    border: "rgba(16, 185, 129, 0.45)",
    accentColor: "#10b981",
    textColor: "#ffffff",
  },
  indigo: {
    background: "linear-gradient(135deg, #130a38 0%, #0c0624 50%, #2a156e 100%)",
    border: "rgba(99, 102, 241, 0.45)",
    accentColor: "#818cf8",
    textColor: "#ffffff",
  },
  rose: {
    background: "linear-gradient(135deg, #380a18 0%, #20040d 50%, #681530 100%)",
    border: "rgba(244, 63, 94, 0.45)",
    accentColor: "#fb7185",
    textColor: "#ffffff",
  },
  slate: {
    background: "linear-gradient(135deg, #1e2229 0%, #0f1115 50%, #2e3540 100%)",
    border: "rgba(148, 163, 184, 0.35)",
    accentColor: "#cbd5e1",
    textColor: "#ffffff",
  },
  gold: {
    background: "linear-gradient(135deg, #3d2b05 0%, #211601 50%, #63470b 100%)",
    border: "rgba(234, 179, 8, 0.55)",
    accentColor: "#facc15",
    textColor: "#ffffff",
  },
  purple: {
    background: "linear-gradient(135deg, #280a3a 0%, #150420 50%, #531677 100%)",
    border: "rgba(168, 85, 247, 0.45)",
    accentColor: "#c084fc",
    textColor: "#ffffff",
  },
  cyan: {
    background: "linear-gradient(135deg, #042533 0%, #02141c 50%, #0a4964 100%)",
    border: "rgba(6, 182, 212, 0.45)",
    accentColor: "#22d3ee",
    textColor: "#ffffff",
  },
};

/**
 * Calculates returns for a transaction:
 * - Fuel surcharge waiver (1% standard if within min-max transaction limits).
 * - Accelerated fuel cashback if fuel category & eligible partner brand.
 * - General/maintenance cashback if maintenance category.
 */
export function calculateCardReturns(
  card: PaymentCard | null | undefined,
  amount: number,
  category: "fuel" | "maintenance",
  detectedFuelBrand?: string | null
): CardReturnsResult {
  if (!card || !amount || amount <= 0 || isNaN(amount)) {
    return {
      surchargeWaiver: 0,
      cashbackAmount: 0,
      totalSavings: 0,
      effectiveRatePercent: 0,
      breakdownText: "",
    };
  }

  let surchargeWaiver = 0;
  let cashbackAmount = 0;
  const breakdownParts: string[] = [];

  if (category === "fuel") {
    // 1. Fuel surcharge waiver check:
    const minWaiver = card.surcharge_min_amount ?? 400;
    const maxWaiver = card.surcharge_max_amount ?? 4000;
    const waiverRate = card.surcharge_waiver_percent ?? 1.0;

    if (amount >= minWaiver && amount <= maxWaiver && waiverRate > 0) {
      surchargeWaiver = Math.round(((amount * waiverRate) / 100) * 100) / 100;
      breakdownParts.push(`₹${surchargeWaiver.toFixed(2)} surcharge waived (${waiverRate}%)`);
    }

    // 2. Fuel cashback check:
    const fuelRate = card.fuel_cashback_percent ?? 0;
    if (fuelRate > 0) {
      const partner = (card.partner_fuel_brand || "all").toLowerCase();
      const detected = (detectedFuelBrand || "").toLowerCase();

      // If card applies to all pumps, or no brand detected (default pump swipe), or brand matches:
      const brandMatches =
        partner === "all" ||
        !detected ||
        detected.includes(partner) ||
        (partner === "bpcl" && (detected.includes("bharat") || detected.includes("bpcl"))) ||
        (partner === "hpcl" && (detected.includes("hindustan") || detected.includes("hpcl") || detected.includes("hp pay"))) ||
        (partner === "iocl" && (detected.includes("indian") || detected.includes("iocl") || detected.includes("indianoil")));

      if (brandMatches) {
        cashbackAmount = Math.round(((amount * fuelRate) / 100) * 100) / 100;
        const brandLabel = partner !== "all" && partner !== "none" ? ` ${partner.toUpperCase()}` : "";
        breakdownParts.push(`₹${cashbackAmount.toFixed(2)} fuel cashback (${fuelRate}%${brandLabel})`);
      }
    }
  } else {
    // Maintenance category
    const otherRate = card.other_cashback_percent ?? 0;
    if (otherRate > 0) {
      cashbackAmount = Math.round(((amount * otherRate) / 100) * 100) / 100;
      breakdownParts.push(`₹${cashbackAmount.toFixed(2)} maintenance cashback (${otherRate}%)`);
    }
  }

  const totalSavings = Math.round((surchargeWaiver + cashbackAmount) * 100) / 100;
  const effectiveRatePercent = amount > 0 ? Math.round(((totalSavings / amount) * 100) * 100) / 100 : 0;
  const breakdownText = breakdownParts.join(" + ");

  return {
    surchargeWaiver,
    cashbackAmount,
    totalSavings,
    effectiveRatePercent,
    breakdownText,
  };
}

/**
 * Format last four digits with masked PAN representation.
 * Strict PCI rule: only last 4 are ever displayed or saved.
 */
export function formatMaskedCardNumber(lastFour: string): string {
  const clean = (lastFour || "").trim().slice(-4).padStart(4, "•");
  return `•••• •••• •••• ${clean}`;
}

/**
 * Get brand / network icon representation or label.
 */
export function networkLabel(network: CardNetwork): string {
  switch (network) {
    case "visa":
      return "VISA";
    case "mastercard":
      return "Mastercard";
    case "rupay":
      return "RuPay";
    case "amex":
      return "AMEX";
    default:
      return "Card";
  }
}

