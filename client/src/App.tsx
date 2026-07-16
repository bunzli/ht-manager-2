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
import { MarketStudiesPage } from "./pages/MarketStudiesPage";
import { MarketStudyInfoPage } from "./pages/MarketStudyInfoPage";
import { MarketAnalyticsPage } from "./pages/MarketAnalyticsPage";
import { PriceModelPage } from "./pages/PriceModelPage";
import { ConfigPage } from "./pages/ConfigPage";

type Tab = "squad" | "market" | "price-model" | "config";

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: "squad", label: "Squad", path: "/squad" },
  { id: "market", label: "Market Studies", path: "/market" },
  { id: "price-model", label: "Price Model", path: "/price-model" },
  { id: "config", label: "Config", path: "/config" },
];

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
      : pathname.startsWith("/config")
        ? "config"
        : "squad";

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <header className="border-b border-indigo-100 bg-white/90 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-2 py-2">
          <Link
            to="/squad"
            className="text-lg font-bold tracking-tight text-slate-950 no-underline sm:text-xl"
          >
            HT Manager
          </Link>
          <nav className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/squad" replace />} />
          <Route path="/squad" element={<PlayersPage />} />
          <Route path="/config" element={<ConfigPage />} />
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
