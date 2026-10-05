import { YOUTH_SKILLS, type YouthSkills } from "../lib/youthApi";
import { skillLabel } from "../lib/skills";

export function YouthSkillsTable({
  skills,
  compact = false,
}: {
  skills: YouthSkills;
  compact?: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Youth skills: current level and potential</caption>
      <thead>
        <tr className="text-xs text-[#777]">
          <th scope="col" className="pb-2 text-left font-normal">
            Skill
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Current
          </th>
          <th scope="col" className="pb-2 text-right font-normal">
            Potential
          </th>
          {!compact && (
            <th scope="col" className="pb-2 pl-3 text-left font-normal">
              Development
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {YOUTH_SKILLS.map(({ key, label }) => {
          const skill = skills[key];
          return (
            <tr key={key} className="border-t border-[#eee]">
              <th scope="row" className="py-2 text-left font-normal text-[#555]">
                {label}
              </th>
              <td
                className="py-2 pl-2 text-right tabular-nums text-[#426e46]"
                title={skill.current == null ? "Unknown" : skillLabel(skill.current)}
              >
                {skill.current ?? "?"}
                {compact && skill.isMaxReached && (
                  <span title="Maximum reached" className="ml-1 text-[10px]">
                    ✓<span className="sr-only"> maximum reached</span>
                  </span>
                )}
              </td>
              <td
                className="py-2 pl-2 text-right tabular-nums"
                title={skill.potential == null ? "Unknown" : skillLabel(skill.potential)}
              >
                {skill.potential ?? "?"}
              </td>
              {!compact && (
                <td className="w-1/3 py-2 pl-3">
                  <div
                    className="relative h-2 overflow-hidden rounded bg-[#eee]"
                    aria-hidden="true"
                  >
                    {skill.potential != null && (
                      <div
                        className="absolute inset-y-0 left-0 bg-[#bdd6bf]"
                        style={{ width: `${Math.min(100, (skill.potential / 8) * 100)}%` }}
                      />
                    )}
                    {skill.current != null && (
                      <div
                        className="absolute inset-y-0 left-0 bg-[#5B955F]"
                        style={{ width: `${Math.min(100, (skill.current / 8) * 100)}%` }}
                      />
                    )}
                  </div>
                  <span className="mt-1 block text-[11px] text-[#777]">
                    {skill.isMaxReached
                      ? "Maximum reached"
                      : skill.current == null
                        ? "Current level unknown"
                        : skill.potential == null
                          ? "Potential unknown"
                          : `${skill.current} / ${skill.potential}`}
                  </span>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
