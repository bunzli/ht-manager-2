import { YOUTH_SKILLS, type ChppYouthPlayer } from "../chpp/youth";

export interface YouthChangeData {
  kind:
    | "current_discovered"
    | "potential_discovered"
    | "improvement"
    | "max_reached"
    | "value_changed";
  key: string;
  oldValue: string | null;
  newValue: string | null;
}

export function detectYouthChanges(
  previous: ChppYouthPlayer | null,
  current: ChppYouthPlayer,
): YouthChangeData[] {
  if (!previous) return [];
  const changes: YouthChangeData[] = [];
  const add = (kind: YouthChangeData["kind"], key: string, before: unknown, after: unknown) => {
    changes.push({
      kind,
      key,
      oldValue: before == null ? null : String(before),
      newValue: after == null ? null : String(after),
    });
  };
  for (const key of YOUTH_SKILLS) {
    const before = previous.skills[key];
    const after = current.skills[key];
    for (const field of ["current", "potential"] as const) {
      if (before[field] === after[field]) continue;
      const kind =
        before[field] == null && after[field] != null
          ? field === "current"
            ? "current_discovered"
            : "potential_discovered"
          : field === "current" &&
              before.current != null &&
              after.current != null &&
              after.current > before.current
            ? "improvement"
            : "value_changed";
      add(kind, `${key}.${field}`, before[field], after[field]);
    }
    if (before.isMaxReached !== after.isMaxReached) {
      add(
        after.isMaxReached ? "max_reached" : "value_changed",
        `${key}.isMaxReached`,
        before.isMaxReached,
        after.isMaxReached,
      );
    }
  }
  for (const field of ["firstName", "nickName", "lastName", "specialty"] as const) {
    if (previous[field] !== current[field])
      add("value_changed", field, previous[field], current[field]);
  }
  return changes;
}
