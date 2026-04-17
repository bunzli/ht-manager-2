interface SoldPlayer {
  finalPrice: number | null;
  playerDetails: { age: number; specialty: number };
}

function groupBy<T, K extends string | number>(
  items: T[],
  keyFn: (item: T) => K,
  valueFn: (item: T) => number,
): Map<K, number[]> {
  const groups = new Map<K, number[]>();
  for (const item of items) {
    const k = keyFn(item);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(valueFn(item));
  }
  return groups;
}

export interface PriceByAge {
  age: number;
  avgPrice: number;
  count: number;
}

export interface PriceBySpecialty {
  specialty: number;
  avgPrice: number;
  count: number;
}

export function aggregateSoldPrices(soldPlayers: SoldPlayer[]): {
  priceByAge: PriceByAge[];
  priceBySpecialty: PriceBySpecialty[];
} {
  const ageGroups = groupBy(
    soldPlayers,
    (p) => p.playerDetails.age,
    (p) => p.finalPrice!,
  );

  const priceByAge: PriceByAge[] = Array.from(ageGroups.entries())
    .map(([age, prices]) => ({
      age,
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      count: prices.length,
    }))
    .sort((a, b) => a.age - b.age);

  const specGroups = groupBy(
    soldPlayers,
    (p) => p.playerDetails.specialty,
    (p) => p.finalPrice!,
  );

  const priceBySpecialty: PriceBySpecialty[] = Array.from(specGroups.entries())
    .map(([specialty, prices]) => ({
      specialty,
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      count: prices.length,
    }))
    .sort((a, b) => a.specialty - b.specialty);

  return { priceByAge, priceBySpecialty };
}
