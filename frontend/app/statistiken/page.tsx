import type { Metadata } from "next";
import StatisticsPage from "./StatisticsPage";

export const metadata: Metadata = {
  title: "Statistiken",
  description: "Statistiken zum DuckVOD-Archiv: Videos, Kanäle, Laufzeit und Speicherplatz.",
  // The statistics page is meant for visitors, not for search results.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <StatisticsPage />;
}
