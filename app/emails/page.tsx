"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, Send } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { CandidateEmail, JobProfile } from "@/types/domain";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<CandidateEmail[]>([]);
  const [jobs, setJobs] = useState<JobProfile[]>([]);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("draft");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<CandidateEmail | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    apiFetch<CandidateEmail[]>("/candidate-emails")
      .then(setEmails)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load emails."));
  }

  useEffect(load, []);

  useEffect(() => {
    apiFetch<JobProfile[]>("/jobs").then(setJobs).catch(() => setJobs([]));
  }, []);

  const filtered = useMemo(() => {
    return emails.filter((email) => {
      const haystack = `${email.candidate_name} ${email.to_email} ${email.job_title} ${email.subject}`.toLowerCase();
      return (!jobId || email.job_id === jobId) && (!status || email.status === status) && haystack.includes(query.toLowerCase());
    });
  }, [emails, jobId, query, status]);

  const draftIds = useMemo(() => filtered.filter((email) => email.status === "draft").map((email) => email.id), [filtered]);

  function startEdit(email: CandidateEmail) {
    setEditing(email);
    setEditSubject(email.subject);
    setEditBody(email.body);
  }

  async function saveEdit() {
    if (!editing) return;
    setError("");
    setMessage("");
    try {
      await apiFetch(`/candidate-emails/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ subject: editSubject, body: editBody })
      });
      setMessage("Draft updated.");
      setEditing(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update draft.");
    }
  }

  async function sendOne(emailId: string) {
    setError("");
    setMessage("");
    try {
      await apiFetch(`/candidate-emails/${emailId}/send`, { method: "POST" });
      setMessage("Email sent.");
      setSelectedIds((current) => current.filter((id) => id !== emailId));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send email.");
      load();
    }
  }

  async function sendSelected() {
    const ids = selectedIds.filter((id) => draftIds.includes(id));
    if (!ids.length) return;
    const ok = window.confirm(`Send ${ids.length} reviewed rejection email drafts now?`);
    if (!ok) return;
    setError("");
    setMessage("");
    try {
      const result = await apiFetch<{ sent: CandidateEmail[]; failed: Array<{ reason: string }> }>("/candidate-emails/send-bulk", {
        method: "POST",
        body: JSON.stringify({ email_ids: ids })
      });
      const failed = result.failed.length ? ` ${result.failed.length} failed.` : "";
      setMessage(`${result.sent.length} emails sent.${failed}`);
      setSelectedIds([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send selected emails.");
      load();
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllDrafts() {
    setSelectedIds((current) => {
      const allSelected = draftIds.length > 0 && draftIds.every((id) => current.includes(id));
      if (allSelected) return current.filter((id) => !draftIds.includes(id));
      return Array.from(new Set([...current, ...draftIds]));
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Candidate communication"
        title="Rejection emails"
        description="Review generated rejection drafts, edit the message, then send approved emails one by one or in bulk."
      />
      {(error || message) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-[#efc6bd] bg-[#fff1ee] text-[#8a352b]" : "border-[#c8dfd4] bg-[#edf8f2] text-[#245b45]"}`}>
          {error || message}
        </div>
      )}
      <Card className="overflow-hidden p-0">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_170px_150px_auto]">
          <Input placeholder="Search by candidate, email, job, or subject" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="focus-ring min-h-10 rounded-md border border-line bg-white px-3 text-sm" value={jobId} onChange={(event) => setJobId(event.target.value)}>
            <option value="">All jobs</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
          <select className="focus-ring min-h-10 rounded-md border border-line bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
          </select>
          <Button className="gap-2" onClick={sendSelected} disabled={!selectedIds.some((id) => draftIds.includes(id))}>
            <Send size={16} />
            Send selected ({selectedIds.filter((id) => draftIds.includes(id)).length})
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-paper text-xs font-bold uppercase tracking-normal text-[#5f6f6b]">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5"><input type="checkbox" checked={draftIds.length > 0 && draftIds.every((id) => selectedIds.includes(id))} onChange={toggleAllDrafts} /></th>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sent</th>
                <th className="px-4 py-3">Failure</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((email) => (
                <tr className="border-b border-line align-top transition hover:bg-paper/80" key={email.id}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.includes(email.id)} onChange={() => toggleSelected(email.id)} disabled={email.status !== "draft"} />
                  </td>
                  <td className="px-4 py-4">
                    <Link className="font-semibold text-moss" href={`/applicants/${email.applicant_id}`}>{email.candidate_name || "Unnamed"}</Link>
                    <p className="mt-1 text-xs text-[#5f6f6b]">{email.to_email}</p>
                  </td>
                  <td className="px-4 py-4">{email.job_title}</td>
                  <td className="max-w-80 px-4 py-4">{email.subject}</td>
                  <td className="px-4 py-4"><StatusBadge value={email.status} /></td>
                  <td className="px-4 py-4 text-[#5f6f6b]">{formatDateTime(email.sent_at)}</td>
                  <td className="max-w-80 px-4 py-4 text-[#8a352b]">{email.failure_reason || "-"}</td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <Button className="min-h-8 gap-2 px-3 py-1 text-xs" onClick={() => startEdit(email)} disabled={email.status !== "draft"}>
                        <Mail size={14} />
                        Review
                      </Button>
                      <Button className="min-h-8 gap-2 bg-[#4d5752] px-3 py-1 text-xs" onClick={() => sendOne(email.id)} disabled={email.status !== "draft"}>
                        <Send size={14} />
                        Send
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {editing && (
        <Card>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-bold">Review draft</h2>
              <p className="mt-1 text-sm text-[#5f6f6b]">{editing.candidate_name} | {editing.to_email}</p>
            </div>
            <Button className="bg-[#4d5752]" onClick={() => setEditing(null)}>Close</Button>
          </div>
          <div className="mt-5 space-y-4">
            <Input value={editSubject} onChange={(event) => setEditSubject(event.target.value)} />
            <textarea
              className="focus-ring min-h-[280px] w-full rounded-lg border border-line bg-white p-3 text-sm leading-6"
              value={editBody}
              onChange={(event) => setEditBody(event.target.value)}
            />
            <Button onClick={saveEdit}>Save draft</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
