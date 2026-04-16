"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Applicant } from "@/types/domain";

export default function AnalyticsPage() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  useEffect(() => {
    apiFetch<Applicant[]>("/applicants").then(setApplicants).catch(() => setApplicants([]));
  }, []);

  const averages = useMemo(() => {
    const scores = applicants.map((item) => Number(item.system_outputs?.final_candidate_score)).filter(Number.isFinite);
    const avg = scores.length ? Math.round(scores.reduce((sum, item) => sum + item, 0) / scores.length) : 0;
    return { avg, scored: scores.length };
  }, [applicants]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Hiring signal overview"
        title="Analytics"
        description="A lightweight view of scoring coverage and candidate volume."
      />
      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Average final score", averages.avg],
          ["Scored candidates", averages.scored],
          ["Imported candidates", applicants.length]
        ].map(([label, value]) => (
          <Card className="min-h-24 transition hover:-translate-y-0.5 hover:border-[#b9ddd5]" key={label}>
            <div className="flex items-start justify-between">
              <p className="text-sm font-semibold text-[#5f6f6b]">{label}</p>
              <BarChart3 className="text-moss" size={20} />
            </div>
            <p className="mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
