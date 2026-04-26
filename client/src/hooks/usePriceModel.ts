import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPriceModelStatus,
  trainPriceModel,
  fetchPlayerPrediction,
  fetchStudyPredictions,
} from "../lib/priceModelApi";

export function usePriceModelStatus() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["priceModel", "status"],
    queryFn: fetchPriceModelStatus,
  });

  const trainMutation = useMutation({
    mutationFn: trainPriceModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["priceModel"] });
    },
  });

  return {
    model: data?.model ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    train: trainMutation.mutateAsync,
    isTraining: trainMutation.isPending,
    trainError: trainMutation.error instanceof Error ? trainMutation.error.message : null,
  };
}

export function usePlayerPrediction(playerId: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["priceModel", "predict", "player", playerId],
    queryFn: () => fetchPlayerPrediction(playerId),
    retry: false,
  });

  return {
    predictedPrice: data?.predictedPrice ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
  };
}

export function useStudyPredictions(studyId: number) {
  const { data, isLoading } = useQuery({
    queryKey: ["priceModel", "predict", "study", studyId],
    queryFn: () => fetchStudyPredictions(studyId),
    retry: false,
  });

  return {
    predictions: data?.predictions ?? null,
    isLoading,
  };
}
