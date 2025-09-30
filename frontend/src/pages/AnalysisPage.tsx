import { ModeToggle } from "@/components/mode-toggle";
import { AnalysisProgress } from "@/components/AnalysisProgress";

interface AnalysisPageProps {
  selectedTablesCount: number;
}

export function AnalysisPage({ selectedTablesCount }: AnalysisPageProps) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <ModeToggle />
      </div>
      <AnalysisProgress selectedTablesCount={selectedTablesCount} />
    </div>
  );
}