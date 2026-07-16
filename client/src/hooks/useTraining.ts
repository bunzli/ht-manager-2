import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTrainingProgress,
  fetchTrainingSettings,
  updateTrainingSettings,
} from "../lib/trainingApi";
import {
  getDefaultTrainingTypeId,
  setStoredTrainingTypeId,
  TRAINING_PROGRAMS,
} from "../lib/trainingPrograms";

export function useTrainingProgramId() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["training", "settings"],
    queryFn: fetchTrainingSettings,
  });

  const [programId, setProgramIdState] = useState(getDefaultTrainingTypeId);

  useEffect(() => {
    if (settings?.trainingTypeId != null) {
      setProgramIdState(settings.trainingTypeId);
      setStoredTrainingTypeId(settings.trainingTypeId);
    }
  }, [settings?.trainingTypeId]);

  const setProgramId = useCallback(
    (id: number) => {
      setProgramIdState(id);
      setStoredTrainingTypeId(id);
      void updateTrainingSettings({ trainingTypeId: id }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["training", "settings"] });
        queryClient.invalidateQueries({ queryKey: ["players"] });
        queryClient.invalidateQueries({ queryKey: ["training", "progress"] });
      });
    },
    [queryClient],
  );

  const programLabel =
    TRAINING_PROGRAMS.find((p) => p.id === programId)?.label ?? "Training";

  return { programId, setProgramId, programLabel };
}

export function useTrainingProgress(programId: number) {
  return useQuery({
    queryKey: ["training", "progress", programId],
    queryFn: () => fetchTrainingProgress(programId),
  });
}
