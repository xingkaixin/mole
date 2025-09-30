import { ModeToggle } from "@/components/mode-toggle";
import { ResultsTable } from "@/components/ResultsTable";
import { RuleResult } from "@/types";

interface ResultsPageProps {
  results: RuleResult[];
  onReanalyze: () => void;
}

export function ResultsPage({ results, onReanalyze }: ResultsPageProps) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <ModeToggle />
      </div>
      <ResultsTable results={results} onReanalyze={onReanalyze} />
    </div>
  );
}