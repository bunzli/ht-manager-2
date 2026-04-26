import { useState } from "react";
import { usePriceModelStatus } from "../hooks/usePriceModel";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import { formatNumber, formatMoney } from "../lib/format";

export function PriceModelPage() {
  const { model, isLoading, error, train, isTraining, trainError } =
    usePriceModelStatus();
  const [lastTrainResult, setLastTrainResult] = useState<string | null>(null);

  const handleTrain = async () => {
    setLastTrainResult(null);
    try {
      const result = await train();
      setLastTrainResult(
        `Model trained on ${formatNumber(result.model.sampleCount)} players (R² = ${result.model.r2})`,
      );
    } catch {
      // trainError is handled by the hook
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading model status..." />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Price Prediction Model</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <p className="text-sm text-gray-500">
          The price model uses linear regression trained on sold players from all
          market studies. It estimates what a player would sell for on the transfer
          market based on skills, age, experience and specialty. Train the model
          after collecting new market data to improve accuracy.
        </p>

        {model ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <Stat label="Training samples" value={formatNumber(model.sampleCount)} />
              <Stat label="R²" value={model.r2.toFixed(4)} />
              <Stat label="Features" value={model.featureCount} />
              <Stat
                label="Mean abs. error"
                value={formatMoney(model.meanAbsError)}
              />
              <Stat
                label="Median abs. error"
                value={formatMoney(model.medianAbsError)}
              />
              <Stat
                label="Trained at"
                value={new Date(model.trainedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            No model trained yet. Collect sold player data through market studies,
            then click the button below to train.
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {trainError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {trainError}
          </div>
        )}

        {lastTrainResult && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {lastTrainResult}
          </div>
        )}

        <button
          onClick={handleTrain}
          disabled={isTraining}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {isTraining
            ? "Training..."
            : model
              ? "Retrain Model"
              : "Train Model"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-gray-400 uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
