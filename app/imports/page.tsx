"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Trash2, Upload } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { JobProfile } from "@/types/domain";

type ImportResult = {
  id: string;
  row_count: number;
  queued_applicant_ids: string[];
};

type ImportProgress = {
  status?: string;
  job_title?: string;
  total: number;
  done: number;
  percent: number;
  counts: Record<string, number>;
  applicants: Array<{
    id: string;
    candidate_name?: string;
    processing_status: string;
    decision?: string;
    score?: number | string;
  }>;
};

type ImportHistoryItem = {
  id: string;
  file_name: string;
  row_count: number;
  status: string;
  job_title?: string;
  applicant_count: number;
  counts: Record<string, number>;
  created_at: string;
};

export default function ImportsPage() {
  const [jobs, setJobs] = useState<JobProfile[]>([]);
  const [jobId, setJobId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [analysisJobId, setAnalysisJobId] = useState("");
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [imports, setImports] = useState<ImportHistoryItem[]>([]);

  function loadImports() {
    apiFetch<ImportHistoryItem[]>("/imports").then(setImports).catch(() => setImports([]));
  }

  useEffect(() => {
    apiFetch<JobProfile[]>("/jobs").then((data) => {
      setJobs(data);
      setJobId(data[0]?.id ?? "");
      setAnalysisJobId(data[0]?.id ?? "");
    });
    loadImports();
  }, []);

  async function upload() {
    if (!file || !jobId) return;
    setError("");
    setMessage("");
    setProgress(null);
    setIsUploading(true);
    const form = new FormData();
    form.set("job_id", jobId);
    form.set("file", file);
    try {
      const result = await apiFetch<ImportResult>("/imports", { method: "POST", body: form });
      setActiveImportId(result.id);
      setMessage(`${result.row_count} candidates imported and queued for one-by-one analysis.`);
      loadImports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not import CSV.");
    } finally {
      setIsUploading(false);
    }
  }

  async function deleteActiveImport() {
    if (!activeImportId || !progress) return;
    const ok = window.confirm(`Delete this import and all ${progress.total} applicants with their analysis data?`);
    if (!ok) return;
    try {
      await apiFetch(`/imports/${activeImportId}`, { method: "DELETE" });
      setActiveImportId(null);
      setProgress(null);
      setMessage("Import batch deleted.");
      setError("");
      loadImports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete import batch.");
    }
  }

  async function analyzeActiveImportForJob() {
    if (!activeImportId || !analysisJobId) return;
    try {
      await apiFetch("/applicants/analyze-for-job", { method: "POST", body: JSON.stringify({ import_id: activeImportId, job_id: analysisJobId, force: true }) });
      setMessage("Import candidates queued for the selected job.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue import for this job.");
    }
  }

  async function pauseActiveImport() {
    if (!activeImportId) return;
    try {
      await apiFetch(`/imports/${activeImportId}/pause`, { method: "POST" });
      setProgress((current) => (current ? { ...current, status: "paused" } : current));
      setMessage("Analysis batch paused. Running applicant may finish, but queued applicants will wait.");
      setError("");
      loadImports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not pause analysis batch.");
    }
  }

  async function resumeActiveImport() {
    if (!activeImportId) return;
    try {
      await apiFetch(`/imports/${activeImportId}/resume`, { method: "POST" });
      setProgress((current) => (current ? { ...current, status: "imported" } : current));
      setMessage("Analysis batch resumed.");
      setError("");
      loadImports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resume analysis batch.");
    }
  }

  async function deleteImport(importId: string, count: number) {
    const ok = window.confirm(`Delete this import and all ${count} applicants with their analysis data?`);
    if (!ok) return;
    try {
      await apiFetch(`/imports/${importId}`, { method: "DELETE" });
      if (activeImportId === importId) {
        setActiveImportId(null);
        setProgress(null);
      }
      setMessage("Import batch deleted.");
      setError("");
      loadImports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete import batch.");
    }
  }

  useEffect(() => {
    if (!activeImportId) return;
    let cancelled = false;
    async function poll() {
      const result = await apiFetch<ImportProgress>(`/imports/${activeImportId}/progress`);
      if (!cancelled) setProgress(result);
    }
    poll().catch(() => undefined);
    const interval = window.setInterval(() => {
      poll().catch(() => undefined);
    }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeImportId]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="CSV intake"
        title="Applicant import"
        description="Upload your existing applicant CSV and attach it to the job profile that should guide evaluation."
      />
      <Card>
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#b9ddd5] bg-[#e9f8f4] text-moss shadow-[0_12px_28px_rgba(20,122,108,0.14)]">
            <Upload size={20} />
          </div>
          <div>
            <h2 className="font-black">Upload applicants</h2>
            <p className="text-sm text-[#5f6f6b]">Original CSV fields are preserved for export.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">
            Target job
            <select className="focus-ring mt-1 min-h-10 w-full rounded-md border border-line bg-white px-3" value={jobId} onChange={(event) => setJobId(event.target.value)}>
              {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">
            Applicant CSV
            <input className="focus-ring mt-1 block min-h-10 w-full rounded-md border border-line bg-white px-3 py-2" type="file" accept=".csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
        <Button className="mt-5" onClick={upload} disabled={isUploading}>{isUploading ? "Uploading..." : "Upload CSV and start analysis"}</Button>
        {message && <p className="mt-4 text-sm text-moss">{message}</p>}
        {error && <p className="mt-4 rounded-lg border border-[#efc6bd] bg-[#fff1ee] px-4 py-3 text-sm text-[#8a352b]">{error}</p>}
        {progress && (
          <div className="mt-5 rounded-lg border border-line bg-paper/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                <p className="font-black">Analysis progress</p>
                  {progress.status === "paused" && <span className="rounded-full border border-[#e1c46d] bg-[#fff7dc] px-2 py-1 text-xs font-semibold text-[#715c13]">Paused</span>}
                </div>
                <p className="mt-1 text-sm text-[#5f6f6b]">{progress.done} of {progress.total} finished{progress.job_title ? ` | ${progress.job_title}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-2 text-2xl font-bold text-moss">{progress.percent}%</p>
                {progress.status === "paused" ? (
                  <Button className="bg-[#4d5752] hover:bg-[#3c4541]" onClick={resumeActiveImport}>
                    <Play className="mr-2" size={16} /> Resume batch
                  </Button>
                ) : (
                  <Button className="bg-[#4d5752] hover:bg-[#3c4541]" onClick={pauseActiveImport}>
                    <Pause className="mr-2" size={16} /> Pause batch
                  </Button>
                )}
                <button className="focus-ring rounded-lg border border-line bg-white p-2 text-coral hover:bg-[#fff1ee]" onClick={deleteActiveImport} title="Delete import batch">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
              <select className="focus-ring min-h-10 rounded-md border border-line bg-white px-3 text-sm" value={analysisJobId} onChange={(event) => setAnalysisJobId(event.target.value)}>
                {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
              <Button onClick={analyzeActiveImportForJob}>Analyze this import for job</Button>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-lg bg-white">
              <div className="h-full bg-moss transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-5">
              {["queued", "running", "completed", "failed", "missing_resume"].map((status) => (
                <div className="rounded-lg border border-line bg-white px-3 py-2" key={status}>
                  <p className="text-xs font-bold uppercase tracking-normal text-[#5f6f6b]">{status.replace("_", " ")}</p>
                  <p className="mt-1 text-lg font-black">{progress.counts[status] ?? 0}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 max-h-64 overflow-auto rounded-lg border border-line bg-white">
              {progress.applicants.map((applicant) => (
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 text-sm last:border-b-0" key={applicant.id}>
                  <span>{applicant.candidate_name || "Unnamed candidate"}</span>
                  <span className="font-semibold text-moss">{applicant.processing_status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
      <Card>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h2 className="font-black">Import history</h2>
            <p className="text-sm text-[#5f6f6b]">Delete a CSV batch and all applicants created from it.</p>
          </div>
          <Button className="bg-[#4d5752] hover:bg-[#3c4541]" onClick={loadImports}>Refresh</Button>
        </div>
        <div className="space-y-3">
          {imports.map((item) => (
            <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-paper/70 p-4 transition hover:border-[#b9ddd5] hover:bg-white md:flex-row md:items-center" key={item.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{item.file_name}</p>
                  {item.status === "paused" && <span className="rounded-full border border-[#e1c46d] bg-[#fff7dc] px-2 py-1 text-xs font-semibold text-[#715c13]">Paused</span>}
                </div>
                <p className="mt-1 text-sm text-[#5f6f6b]">
                  {item.job_title ? `${item.job_title} | ` : ""}{item.applicant_count} applicants | completed {item.counts.completed ?? 0} | failed {item.counts.failed ?? 0} | queued {item.counts.queued ?? 0}
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="bg-[#4d5752] hover:bg-[#3c4541]" onClick={() => setActiveImportId(item.id)}>View progress</Button>
                <Button className="bg-coral hover:bg-[#a84436]" onClick={() => deleteImport(item.id, item.applicant_count)}>Delete batch</Button>
              </div>
            </div>
          ))}
          {!imports.length && <p className="text-sm text-[#5f6f6b]">No CSV imports yet.</p>}
        </div>
      </Card>
    </div>
  );
}
