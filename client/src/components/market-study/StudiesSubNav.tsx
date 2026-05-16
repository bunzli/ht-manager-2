import { Link, useLocation } from "react-router-dom";

export function StudiesSubNav() {
  const { pathname } = useLocation();
  const isAnalytics = pathname.startsWith("/market/analytics");
  const isStudies =
    pathname === "/market" ||
    (pathname.startsWith("/market/") && !isAnalytics);

  const pill = (active: boolean) =>
    `px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
      active
        ? "bg-blue-600 text-white shadow-sm"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
    }`;

  return (
    <nav className="flex items-center gap-2 mb-6" aria-label="Market studies sections">
      <Link to="/market" className={pill(isStudies)}>
        Studies
      </Link>
      <Link to="/market/analytics" className={pill(isAnalytics)}>
        Analytics
      </Link>
    </nav>
  );
}
