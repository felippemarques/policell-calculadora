import { describe, it, expect } from "vitest";
import { applyAppleCasing, applyAppleCasingForBrand, isAppleBrand } from "./apple-naming";

describe("applyAppleCasing", () => {
  it("corrige iPhone", () => {
    expect(applyAppleCasing("Iphone")).toBe("iPhone");
    expect(applyAppleCasing("iphone 14")).toBe("iPhone 14");
    expect(applyAppleCasing("IPHONE 14 PRO MAX")).toBe("iPhone 14 Pro Max");
  });

  it("corrige Pro Max", () => {
    expect(applyAppleCasing("Pro max")).toBe("Pro Max");
    expect(applyAppleCasing("pro Max")).toBe("Pro Max");
    expect(applyAppleCasing("PRO MAX")).toBe("Pro Max");
  });

  it("mantém Pro Max já correto", () => {
    expect(applyAppleCasing("Pro Max")).toBe("Pro Max");
  });

  it("corrige outras marcas Apple", () => {
    expect(applyAppleCasing("ipad air")).toBe("iPad Air");
    expect(applyAppleCasing("MACBOOK pro 16")).toBe("MacBook Pro 16");
    expect(applyAppleCasing("airpods pro")).toBe("AirPods Pro");
    expect(applyAppleCasing("imac 24")).toBe("iMac 24");
  });

  it("preserva SE em maiúsculo", () => {
    expect(applyAppleCasing("iphone se")).toBe("iPhone SE");
  });

  it("colapsa espaços extras", () => {
    expect(applyAppleCasing("  iphone   14  pro  ")).toBe("iPhone 14 Pro");
  });

  it("preserva parênteses", () => {
    expect(applyAppleCasing("ipad air (2nd Gen)")).toBe("iPad Air (2nd Gen)");
  });

  it("normaliza armazenamento", () => {
    expect(applyAppleCasing("iphone 15 256gb")).toBe("iPhone 15 256GB");
    expect(applyAppleCasing("ipad pro 1tb")).toBe("iPad Pro 1TB");
  });
});

describe("isAppleBrand", () => {
  it("detecta Apple", () => {
    expect(isAppleBrand("Apple")).toBe(true);
    expect(isAppleBrand("apple")).toBe(true);
    expect(isAppleBrand(" APPLE ")).toBe(true);
    expect(isAppleBrand("Samsung")).toBe(false);
    expect(isAppleBrand(null)).toBe(false);
  });
});

describe("applyAppleCasingForBrand", () => {
  it("aplica só para Apple", () => {
    expect(applyAppleCasingForBrand("iphone 14", "Apple")).toBe("iPhone 14");
    expect(applyAppleCasingForBrand("galaxy s24", "Samsung")).toBe("galaxy s24");
  });
});
