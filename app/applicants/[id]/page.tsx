"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Applicant, CandidateEmail, JobProfile } from "@/types/domain";

function JsonPanel({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[440px] overflow-auto rounded-lg border border-line bg-paper p-4 text-xs leading-5">
      {JSON.stringify(value ?? {}, null, 2)}
    </pre>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

const roleStopWords = new Set(["a", "an", "and", "for", "in", "of", "the", "to", "role", "job", "position", "opening"]);

function roleTokens(value?: string | null) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter((token) => token && !roleStopWords.has(token))
  );
}

function roleMatches(appliedRole: string | undefined, jobTitle: string) {
  if (!appliedRole) return false;
  const applied = roleTokens(appliedRole);
  const job = roleTokens(jobTitle);
  const smaller = Math.min(applied.size, job.size);
  if (!smaller) return false;
  let overlap = 0;
  applied.forEach((token) => {
    if (job.has(token)) overlap += 1;
  });
  return overlap / smaller >= 0.75;
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [emails, setEmails] = useState<CandidateEmail[]>([]);
  const [jobs, setJobs] = useState<JobProfile[]>([]);
  const [jobId, setJobId] = useState("");
  const [selectedAnalysisJobId, setSelectedAnalysisJobId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    const query = selectedAnalysisJobId ? `?job_id=${selectedAnalysisJobId}` : "";
    apiFetch<Applicant>(`/applicants/${params.id}${query}`).then((data) => {
      setApplicant(data);
      if (!selectedAnalysisJobId) {
        const preferred = data.job_analyses?.find((analysis) => analysis.matches_applied_role) ?? data.selected_job_analysis;
        if (preferred?.job_id) setSelectedAnalysisJobId(preferred.job_id);
      }
    });
  }

  function loadEmails() {
    apiFetch<CandidateEmail[]>(`/candidate-emails?applicant_id=${params.id}`).then(setEmails).catch(() => setEmails([]));
  }

  useEffect(load, [params.id, selectedAnalysisJobId]);
  useEffect(loadEmails, [params.id]);

  useEffect(() => {
    apiFetch<JobProfile[]>("/jobs").then((data) => {
      setJobs(data);
      setJobId(data[0]?.id ?? "");
    }).catch(() => setJobs([]));
  }, []);

  async function reprocess() {
    setError("");
    setMessage("");
    try {
      await apiFetch(`/applicants/${params.id}/reprocess`, { method: "POST" });
      setMessage("Applicant queued for re-analysis.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue applicant.");
    }
  }

  async function analyzeForJob() {
    const targetJobId = analysisJobValue || jobId;
    if (!targetJobId) return;
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<{ queued: number; skipped?: Array<{ reason: string }> }>("/applicants/analyze-for-job", { method: "POST", body: JSON.stringify({ applicant_ids: [params.id], job_id: targetJobId, force: true }) });
      if (result.queued) {
        setMessage("Applicant queued for the selected job.");
      } else {
        setError(result.skipped?.[0]?.reason ?? "This applicant cannot be analyzed for that job.");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue applicant for this job.");
    }
  }

  async function draftRejectionEmail() {
    if (!selectedAnalysisJobId) return;
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<{ drafted: Array<{ id: string }>; skipped: Array<{ reason: string }> }>("/candidate-emails/draft-rejections", {
        method: "POST",
        body: JSON.stringify({ applicant_ids: [params.id], job_id: selectedAnalysisJobId, overwrite_existing_drafts: true })
      });
      if (result.drafted.length) {
        setMessage("Rejection email draft ready in Emails.");
      } else {
        setError(result.skipped[0]?.reason ?? "This candidate is not eligible for a rejection email draft.");
      }
      load();
      loadEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not draft rejection email.");
    }
  }

  if (!applicant) return <p>Loading candidate...</p>;
  const output = applicant.system_outputs || {};
  const final = applicant.final_evaluation || {};
  const selectedAnalysis = applicant.selected_job_analysis;
  const selectedRoleAllowed = selectedAnalysis?.matches_applied_role !== false;
  const topStrengths = Array.isArray(final.strengths) ? final.strengths : output.top_strengths;
  const topGaps = Array.isArray(final.gaps) ? final.gaps : output.top_gaps;
  const selectedRoleEmails = emails.filter((email) => email.job_id === selectedAnalysisJobId);
  const otherRoleEmails = emails.filter((email) => email.job_id !== selectedAnalysisJobId);
  const matchingJobs = jobs.filter((job) => job.id === applicant.job_id || roleMatches(applicant.applied_role, job.title));
  const jobsForAnalysis = matchingJobs.length ? matchingJobs : jobs.filter((job) => job.id === applicant.job_id);
  const analysisJobValue = jobsForAnalysis.some((job) => job.id === jobId) ? jobId : jobsForAnalysis[0]?.id ?? "";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Candidate detail"
        title={applicant.candidate_name ?? "Unnamed candidate"}
        description={`${applicant.candidate_email ?? "No email"} | ${applicant.applied_role ?? "No role"}`}
        action={<Button onClick={reprocess}>Re-run</Button>}
      />
      {(error || message) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-[#efc6bd] bg-[#fff1ee] text-[#8a352b]" : "border-[#c8dfd4] bg-[#edf8f2] text-[#245b45]"}`}>
          {error || message}
        </div>
      )}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-black">Role analyses</h2>
            <p className="mt-1 text-sm text-[#5f6f6b]">Choose a job analysis to inspect the exact score, rationale, dimensions, and rejection email for that role.</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-end">
            <label className="block text-xs font-bold uppercase tracking-normal text-[#5f6f6b]">
              View analysis
              <select className="focus-ring mt-1 h-9 w-full rounded-md border border-line bg-white px-3 text-sm" value={selectedAnalysisJobId} onChange={(event) => setSelectedAnalysisJobId(event.target.value)}>
                {!applicant.job_analyses?.length && <option value="">No job analysis yet</option>}
                {(applicant.job_analyses || []).map((analysis) => (
                  <option key={analysis.run_id ?? analysis.job_id} value={analysis.job_id}>
                    {analysis.matches_applied_role === false ? "Blocked: " : ""}{analysis.job_title} | {analysis.decision ?? analysis.status ?? "analysis"} | {analysis.final_score ?? "-"}
                  </option>
                ))}
              </select>
            </label>
            <Button className="bg-[#4d5752]" onClick={draftRejectionEmail} disabled={!selectedAnalysisJobId || !selectedRoleAllowed}>Draft rejection</Button>
          </div>
          <div className="grid gap-3 border-t border-line pt-3 xl:grid-cols-[1fr_auto] xl:items-end">
            <label className="block text-xs font-bold uppercase tracking-normal text-[#5f6f6b]">
              Run this applicant for another job
              <select className="focus-ring mt-1 h-9 w-full rounded-md border border-line bg-white px-3 text-sm" value={analysisJobValue} onChange={(event) => setJobId(event.target.value)}>
                {jobsForAnalysis.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
              </select>
            </label>
            <Button onClick={analyzeForJob} disabled={!analysisJobValue}>Analyze</Button>
          </div>
          {!jobsForAnalysis.length && <p className="text-sm text-[#8a352b]">No matching job profile was found for this applicant&apos;s applied role.</p>}
        </div>
        {selectedAnalysis && (
          <div className={`mt-4 rounded-md border p-3 ${selectedRoleAllowed ? "border-[#b9ddd5] bg-[#e9f8f4]" : "border-[#f1b2a4] bg-[#fff0ed]"}`}>
            <p className="text-sm font-black text-ink">Viewing: {selectedAnalysis.job_title}</p>
            <p className="mt-1 text-sm text-[#4f5f5b]">
              Score {selectedAnalysis.final_score ?? "-"} | Decision {selectedAnalysis.decision ?? "-"} | Status {selectedAnalysis.status ?? "-"}
            </p>
            {!selectedRoleAllowed && (
              <p className="mt-2 text-sm font-semibold text-[#9c3726]">
                Safeguard active: rejection emails are blocked because {selectedAnalysis.role_match_reason || "this analysis does not match the applied role"}.
              </p>
            )}
          </div>
        )}
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-paper/70 text-xs font-bold uppercase tracking-normal text-[#5f6f6b]">
              <tr>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Decision</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {(applicant.job_analyses || []).map((analysis) => (
                <tr className="border-b border-line align-top" key={analysis.run_id ?? analysis.job_id}>
                  <td className="px-3 py-2.5 font-semibold">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{analysis.job_title}</span>
                      {analysis.matches_applied_role === false && <span className="rounded-md border border-[#f1b2a4] bg-[#fff0ed] px-2 py-0.5 text-xs font-bold text-[#9c3726]">blocked</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-bold">{analysis.final_score ?? "-"}</td>
                  <td className="px-3 py-2.5"><StatusBadge value={analysis.decision ?? undefined} /></td>
                  <td className="px-3 py-2.5"><StatusBadge value={analysis.status} /></td>
                  <td className="px-3 py-2.5 text-[#4f5f5b]">{analysis.summary || analysis.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-black">Selected role email history</h2>
            <p className="mt-1 text-sm text-[#5f6f6b]">Drafted, sent, and failed rejection emails for {selectedAnalysis?.job_title ?? "the selected role"}.</p>
          </div>
          <Button className="bg-[#4d5752]" onClick={loadEmails}>Refresh emails</Button>
        </div>
        <div className="mt-4 space-y-3">
          {selectedRoleEmails.map((email) => (
            <div className="rounded-lg border border-line bg-paper/80 p-4" key={email.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black">{email.job_title || "Unknown role"}</p>
                    <StatusBadge value={email.status} />
                  </div>
                  <p className="mt-1 text-sm text-[#5f6f6b]">To: {email.to_email} | Sent: {formatDateTime(email.sent_at)}</p>
                  {email.failure_reason && <p className="mt-2 rounded-md border border-[#f1b2a4] bg-[#fff0ed] px-3 py-2 text-sm text-[#9c3726]">{email.failure_reason}</p>}
                </div>
                <p className="text-xs font-bold uppercase tracking-normal text-[#5f6f6b]">Updated {formatDateTime(email.updated_at)}</p>
              </div>
              <div className="mt-4 rounded-lg border border-line bg-white p-4">
                <p className="text-sm font-black">{email.subject}</p>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#33403d]">{email.body}</pre>
              </div>
            </div>
          ))}
          {!selectedRoleEmails.length && <p className="rounded-lg border border-dashed border-line bg-paper/70 p-4 text-sm text-[#5f6f6b]">No rejection email has been drafted or sent for the selected role yet.</p>}
          {!!otherRoleEmails.length && (
            <details className="rounded-lg border border-line bg-white p-3">
              <summary className="cursor-pointer text-sm font-black text-moss">Other role emails ({otherRoleEmails.length})</summary>
              <div className="mt-3 space-y-2">
                {otherRoleEmails.map((email) => (
                  <div className="rounded-md border border-line bg-paper/70 p-3" key={email.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{email.job_title || "Unknown role"}</p>
                      <StatusBadge value={email.status} />
                      <span className="text-xs text-[#5f6f6b]">Sent {formatDateTime(email.sent_at)}</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold">{email.subject}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </Card>
      <section className="grid gap-4 md:grid-cols-4">
        <Card className="min-h-24"><p className="text-sm font-semibold text-[#5f6f6b]">Selected score</p><p className="mt-2 text-2xl font-black">{selectedAnalysis?.final_score ?? output.final_candidate_score ?? "-"}</p></Card>
        <Card className="min-h-24"><p className="text-sm font-semibold text-[#5f6f6b]">Selected decision</p><div className="mt-3"><StatusBadge value={selectedAnalysis?.decision ?? output.final_candidate_decision} /></div></Card>
        <Card className="min-h-24"><p className="text-sm font-semibold text-[#5f6f6b]">Selected analysis</p><div className="mt-3"><StatusBadge value={selectedAnalysis?.status ?? applicant.processing_status} /></div></Card>
        <Card className="min-h-24"><p className="text-sm font-semibold text-[#5f6f6b]">Interview</p><p className="mt-2 text-lg font-black capitalize">{String(final.interview_recommendation ?? output.interview_recommendation ?? "maybe")}</p></Card>
      </section>
      <Card>
        <h2 className="text-lg font-black">Selected role rationale</h2>
        <p className="mt-3 text-sm leading-6">{String(final.summary ?? output.candidate_fit_summary ?? selectedAnalysis?.summary ?? "No synthesis yet.")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Top strengths</h3>
            <p className="mt-2 text-sm">{Array.isArray(topStrengths) ? topStrengths.join("; ") : String(topStrengths ?? "-")}</p>
          </div>
          <div>
            <h3 className="font-semibold">Top gaps</h3>
            <p className="mt-2 text-sm">{Array.isArray(topGaps) ? topGaps.join("; ") : String(topGaps ?? "-")}</p>
          </div>
        </div>
      </Card>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-black">Selected role dimensions</h2>
          <p className="mt-1 text-sm text-[#5f6f6b]">These reasoning notes change when you choose another role analysis.</p>
          <div className="mt-4 space-y-3">
            {(applicant.dimension_results || []).map((result) => (
              <div className="rounded-lg border border-line p-4 transition hover:border-moss" key={String(result.id)}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold capitalize">{String(result.dimension).replaceAll("_", " ")}</p>
                  <p className="rounded-md bg-paper px-2 py-1 text-xs font-semibold">{String(result.score ?? "-")} / 10 | confidence {String(result.confidence ?? "-")}</p>
                </div>
                <p className="mt-2 text-sm text-[#4f5f5b]">{result.result_json?.reasoning}</p>
              </div>
            ))}
            {!applicant.dimension_results?.length && <p className="rounded-lg border border-dashed border-line bg-paper/70 p-4 text-sm text-[#5f6f6b]">No dimension results are stored for the selected role yet.</p>}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-black">Resume parsing</h2>
          <p className="mt-1 text-sm text-[#5f6f6b]">Shared source evidence used across role analyses.</p>
          <p className="mt-2 text-sm">Status: {String(applicant.resume?.extraction_status ?? "unknown")}</p>
          <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-paper p-4 text-xs">{String(applicant.resume?.extracted_text ?? "No extracted text stored yet.").slice(0, 6000)}</pre>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-black">Structured candidate profile</h2>
          <p className="mt-1 text-sm text-[#5f6f6b]">Shared candidate profile; scoring and comments above are role-specific.</p>
          <div className="mt-4"><JsonPanel value={applicant.profile?.profile_json} /></div>
        </Card>
        <Card>
          <h2 className="text-lg font-black">Original applicant data</h2>
          <div className="mt-4"><JsonPanel value={applicant.original_data} /></div>
        </Card>
      </section>
    </div>
  );
}
