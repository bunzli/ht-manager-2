export type TrainingPosition =
  | "goalkeeper"
  | "centralDefender"
  | "wingBack"
  | "innerMidfielder"
  | "winger"
  | "forward";

export interface TrainingProgramInfo {
  id: number;
  label: string;
  popSkillKeys: string[];
}

export const TRAINING_PROGRAMS: TrainingProgramInfo[] = [
  { id: 2, label: "Set pieces", popSkillKeys: ["setPiecesSkill"] },
  { id: 3, label: "Defending", popSkillKeys: ["defenderSkill"] },
  { id: 4, label: "Scoring", popSkillKeys: ["scorerSkill"] },
  { id: 5, label: "Winger (crossing)", popSkillKeys: ["wingerSkill"] },
  { id: 6, label: "Scoring + set pieces", popSkillKeys: ["scorerSkill", "setPiecesSkill"] },
  { id: 7, label: "Short passes", popSkillKeys: ["passingSkill"] },
  { id: 8, label: "Playmaking", popSkillKeys: ["playmakerSkill"] },
  { id: 9, label: "Goalkeeping", popSkillKeys: ["keeperSkill"] },
  { id: 10, label: "Through passes", popSkillKeys: ["passingSkill"] },
  { id: 11, label: "Defensive positions", popSkillKeys: ["defenderSkill"] },
  { id: 12, label: "Wing attacks", popSkillKeys: ["wingerSkill"] },
];

export const TRAINING_TYPE_STORAGE_KEY = "ht-manager-training-type";

export function getDefaultTrainingTypeId(): number {
  const stored = localStorage.getItem(TRAINING_TYPE_STORAGE_KEY);
  if (stored) {
    const id = parseInt(stored, 10);
    if (TRAINING_PROGRAMS.some((p) => p.id === id)) return id;
  }
  return 8;
}

export function setStoredTrainingTypeId(id: number): void {
  localStorage.setItem(TRAINING_TYPE_STORAGE_KEY, String(id));
}
