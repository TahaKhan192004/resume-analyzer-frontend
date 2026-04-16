"use client";

import { useEffect, useState } from "react";
import { FileDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { apiFetch, exportUrl, getToken } from "@/lib/api";
import type { JobProfile } from "@/types/domain";

export default function ExportsPage() {
  const [jobs, setJobs] = useState<JobProfile[]>([]);
  const [jobId, setJobId] = useState("");
  const [decision, setDecision] = useState("");

  useEffect(() => {
    apiFetch<JobProfile[]>("/jobs").then((data) => {
      setJobs(data);
      setJobId(data[0]?.id ?? "");
    });
  }, []);

  async function download() {
    if (!jobId) return;
    const response = await fetch(exportUrl(jobId, decision || undefined), {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${decision || "all"}-enriched-applicants.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Recruiter-ready output"
        title="Exports"
        description="Download clean enriched CSV files with only the operational AI columns added."
      />
      <Card className="max-w-4xl">
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#b9ddd5] bg-[#e9f8f4] text-moss shadow-[0_12px_28px_rgba(20,122,108,0.14)]">
            <FileDown size={20} />
          </div>
          <div>
            <h2 className="font-black">Choose export</h2>
            <p className="text-sm text-[#5f6f6b]">Export all applicants or only one decision group.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Job
            <select className="focus-ring mt-1 min-h-10 w-full rounded-md border border-line bg-white px-3" value={jobId} onChange={(event) => setJobId(event.target.value)}>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Export type
            <select className="focus-ring mt-1 min-h-10 w-full rounded-md border border-line bg-white px-3" value={decision} onChange={(event) => setDecision(event.target.value)}>
              <option value="">Full enriched CSV</option>
              <option value="shortlist">Shortlist only</option>
              <option value="review">Review only</option>
              <option value="reject">Rejected only</option>
            </select>
          </label>
        </div>
        <Button className="mt-5" onClick={download}>Download CSV</Button>
        <p className="mt-4 text-sm leading-6 text-[#5f6f6b]">The export preserves original applicant columns and adds only the ten recruiter-facing AI output fields.</p>
      </Card>
    </div>
  );
}
