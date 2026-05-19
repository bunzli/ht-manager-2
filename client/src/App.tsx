import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
  Link,
} from "react-router-dom";
import { PlayersPage } from "./pages/PlayersPage";
import { PlayerDetailPage } from "./pages/PlayerDetailPage";
import { MarketStudiesPage } from "./pages/MarketStudiesPage";
import { MarketStudyInfoPage } from "./pages/MarketStudyInfoPage";
import { MarketAnalyticsPage } from "./pages/MarketAnalyticsPage";
import { PriceModelPage } from "./pages/PriceModelPage";
import { TrainingPage } from "./pages/TrainingPage";

type Tab = "squad" | "training" | "market" | "price-model";

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: "squad", label: "My Squad", path: "/squad" },
  { id: "training", label: "Training", path: "/training" },
  { id: "market", label: "Market Studies", path: "/market" },
  { id: "price-model", label: "Price Model", path: "/price-model" },
];

function SquadDetailRoute() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  return (
    <PlayerDetailPage
      playerId={Number(playerId)}
      onBack={() => navigate("/squad")}
    />
  );
}

function MarketStudyRoute() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  return (
    <MarketStudyInfoPage
      studyId={Number(studyId)}
      onBack={() => navigate("/market")}
    />
  );
}

export default function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeTab: Tab = pathname.startsWith("/market")
    ? "market"
    : pathname.startsWith("/price-model")
      ? "price-model"
      : pathname.startsWith("/training")
        ? "training"
        : "squad";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-14">
          <Link
            to="/squad"
            className="text-xl font-bold text-gray-900 no-underline"
          >
            HT Manager
          </Link>
          <nav className="flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="px-4 py-6 sm:px-6 max-w-7xl mx-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/squad" replace />} />
          <Route
            path="/squad"
            element={
              <PlayersPage
                onPlayerClick={(id) => navigate(`/squad/${id}`)}
              />
            }
          />
          <Route path="/squad/:playerId" element={<SquadDetailRoute />} />
          <Route
            path="/training"
            element={
              <TrainingPage
                onPlayerClick={(id) => navigate(`/squad/${id}`)}
              />
            }
          />
          <Route path="/market/analytics" element={<MarketAnalyticsPage />} />
          <Route
            path="/market"
            element={
              <MarketStudiesPage
                onStudyClick={(id) => navigate(`/market/${id}`)}
              />
            }
          />
          <Route path="/market/:studyId" element={<MarketStudyRoute />} />
          <Route path="/price-model" element={<PriceModelPage />} />
        </Routes>
      </main>
    </div>
  );
}
