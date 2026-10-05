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
import { YouthSquadPage } from "./pages/YouthSquadPage";
import { YouthPlayerPage } from "./pages/YouthPlayerPage";

type Tab = "squad" | "youth" | "market" | "price-model" | "config";

const TABS: { id: Tab; label: string; path: string }[] = [
  { id: "squad", label: "Squad", path: "/squad" },
  { id: "youth", label: "Youth Squad", path: "/youth" },
  { id: "market", label: "Market Studies", path: "/market" },
  { id: "price-model", label: "Price Model", path: "/price-model" },
  { id: "config", label: "Config", path: "/config" },
];

function MarketStudyRoute() {
  const { studyId } = useParams<{ studyId: string }>();
  const navigate = useNavigate();
  return <MarketStudyInfoPage studyId={Number(studyId)} onBack={() => navigate("/market")} />;
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
        : pathname.startsWith("/youth")
          ? "youth"
          : "squad";

  return (
    <div className="min-h-screen bg-[#F2F2F2] text-[#444]">
      <header className="border-b border-[#ddd] bg-white px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col items-start justify-between gap-3 py-4 sm:flex-row sm:items-center">
          <Link
            to="/squad"
            className="text-lg font-bold tracking-tight text-[#444] no-underline sm:text-xl"
          >
            HT Manager
          </Link>
          <nav className="grid w-full grid-cols-2 gap-1 rounded-xl bg-[#f2f2f2] p-1 sm:flex sm:w-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                aria-current={activeTab === tab.id ? "page" : undefined}
                onClick={() => navigate(tab.path)}
                className={`min-h-11 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5B955F] ${
                  activeTab === tab.id
                    ? "bg-[#5B955F] text-white shadow-sm"
                    : "text-[#666] hover:bg-white hover:text-[#444]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-6">
        <Routes>
          <Route path="/" element={<Navigate to="/squad" replace />} />
          <Route path="/squad" element={<PlayersPage />} />
          <Route path="/youth" element={<YouthSquadPage />} />
          <Route path="/youth/players/:id" element={<YouthPlayerPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/market/analytics" element={<MarketAnalyticsPage />} />
          <Route
            path="/market"
            element={<MarketStudiesPage onStudyClick={(id) => navigate(`/market/${id}`)} />}
          />
          <Route path="/market/:studyId" element={<MarketStudyRoute />} />
          <Route path="/price-model" element={<PriceModelPage />} />
        </Routes>
      </main>
    </div>
  );
}
