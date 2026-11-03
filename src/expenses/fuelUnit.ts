import type { FuelUnit } from "@/lib/offline-queue";
import type { Vehicle } from "@/vehicles/useVehicles";

/** Pick the fuel-quantity unit for a vehicle based on its fuel_type. */
export function unitForVehicle(fuelType: Vehicle["fuel_type"]): FuelUnit {
  switch (fuelType) {
    case "electric": return "kWh";
    case "cng":      return "kg";
    case "hybrid":   return "L"; // treat as petrol by default; separate EV log possible
    case "diesel":
    case "petrol":
    default:         return "L";
  }
}

/** Human-friendly label for the "Fuel" tab given the unit. */
export function fuelActionLabel(unit: FuelUnit): string {
  return unit === "kWh" ? "Charge" : unit === "kg" ? "Fill" : "Fuel";
}

/** The field name shown to the user for the quantity input. */
export function quantityFieldLabel(unit: FuelUnit): string {
  return unit === "kWh" ? "Energy (kWh)" : unit === "kg" ? "Weight (kg)" : "Litres";
}

/** The per-unit price label shown in analytics / history. */
export function pricePerUnitLabel(unit: FuelUnit): string {
  return unit === "kWh" ? "₹/kWh" : unit === "kg" ? "₹/kg" : "₹/L";
}

/** The economy label — km/L for liquid, km/kWh for electric, km/kg for CNG. */
export function economyLabel(unit: FuelUnit): string {
  return unit === "kWh" ? "km / kWh" : unit === "kg" ? "km / kg" : "km / L";
}
