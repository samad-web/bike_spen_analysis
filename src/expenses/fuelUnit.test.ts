import { describe, it, expect } from "vitest";
import { economyLabel, fuelActionLabel, pricePerUnitLabel, quantityFieldLabel, unitForVehicle } from "./fuelUnit";

describe("unitForVehicle", () => {
  it("maps electric to kWh", () => expect(unitForVehicle("electric")).toBe("kWh"));
  it("maps cng to kg", () => expect(unitForVehicle("cng")).toBe("kg"));
  it("maps petrol/diesel/null/hybrid to L", () => {
    expect(unitForVehicle("petrol")).toBe("L");
    expect(unitForVehicle("diesel")).toBe("L");
    expect(unitForVehicle("hybrid")).toBe("L");
    expect(unitForVehicle(null)).toBe("L");
  });
});

describe("labels", () => {
  it("switches the action verb for electric and CNG", () => {
    expect(fuelActionLabel("kWh")).toBe("Charge");
    expect(fuelActionLabel("kg")).toBe("Fill");
    expect(fuelActionLabel("L")).toBe("Fuel");
  });
  it("names the quantity input per unit", () => {
    expect(quantityFieldLabel("L")).toBe("Litres");
    expect(quantityFieldLabel("kWh")).toContain("kWh");
    expect(quantityFieldLabel("kg")).toContain("kg");
  });
  it("formats per-unit price label", () => {
    expect(pricePerUnitLabel("L")).toBe("₹/L");
    expect(pricePerUnitLabel("kWh")).toBe("₹/kWh");
    expect(pricePerUnitLabel("kg")).toBe("₹/kg");
  });
  it("formats fuel economy label per unit", () => {
    expect(economyLabel("L")).toBe("km / L");
    expect(economyLabel("kWh")).toBe("km / kWh");
    expect(economyLabel("kg")).toBe("km / kg");
  });
});
