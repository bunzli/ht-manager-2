type TrainingPosition =
  | "goalkeeper"
  | "centralDefender"
  | "wingBack"
  | "innerMidfielder"
  | "winger"
  | "forward";

export function matchRoleToTrainingPosition(
  roleId: number,
): TrainingPosition | null {
  if (roleId <= 0) return null;
  if (roleId === 100) return "goalkeeper";
  if (roleId === 101 || roleId === 105 || roleId === 119 || roleId === 202 || roleId === 209) {
    return "wingBack";
  }
  if (
    roleId === 102 ||
    roleId === 103 ||
    roleId === 104 ||
    roleId === 115 ||
    roleId === 201 ||
    roleId === 208
  ) {
    return "centralDefender";
  }
  if (roleId === 106 || roleId === 110 || roleId === 117 || roleId === 205 || roleId === 212) {
    return "winger";
  }
  if (roleId === 107 || roleId === 108 || roleId === 109 || roleId === 116 || roleId === 203 || roleId === 210) {
    return "innerMidfielder";
  }
  if (roleId === 111 || roleId === 112 || roleId === 113 || roleId === 118 || roleId === 204 || roleId === 211) {
    return "forward";
  }
  if (roleId === 114 || roleId === 200 || roleId === 207) return "goalkeeper";
  if (roleId === 1) return "goalkeeper";
  if (roleId === 2 || roleId === 5) return "wingBack";
  if (roleId === 3 || roleId === 4) return "centralDefender";
  if (roleId === 6 || roleId === 9) return "winger";
  if (roleId === 7 || roleId === 8) return "innerMidfielder";
  if (roleId === 10 || roleId === 11) return "forward";
  if (roleId >= 12 && roleId <= 16) {
    const subMap: Record<number, TrainingPosition> = {
      12: "goalkeeper",
      13: "centralDefender",
      14: "innerMidfielder",
      15: "winger",
      16: "forward",
    };
    return subMap[roleId] ?? null;
  }
  if (roleId >= 17 && roleId <= 35) return null;
  return null;
}

export function lastMatchRoleLabel(positionCode: number | null | undefined): string {
  if (positionCode == null) return "—";
  const pos = matchRoleToTrainingPosition(positionCode);
  if (!pos) return "—";
  const labels: Record<TrainingPosition, string> = {
    goalkeeper: "GK",
    centralDefender: "CD",
    wingBack: "WB",
    innerMidfielder: "IM",
    winger: "W",
    forward: "FW",
  };
  return labels[pos];
}
