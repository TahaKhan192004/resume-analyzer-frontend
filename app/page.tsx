"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, FileWarning, Send, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import type { Applicant, CandidateEmail, JobProfile } from "@/types/domain";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobProfile[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [emails, setEmails] = useState<CandidateEmail[]>([]);

  useEffect(() => {
    apiFetch<JobProfile[]>("/jobs").then(setJobs).catch(() => setJobs([]));
    apiFetch<Applicant[]>("/applicants").then(setApplicants).catch(() => setApplicants([]));
    apiFetch<CandidateEmail[]>("/candidate-emails").then(setEmails).catch(() => setEmails([]));
  }, []);

  const metrics = useMemo(() => {
    const decisions = applicants.map((item) => item.system_outputs?.final_candidate_decision);
    const items: Array<[string, number, LucideIcon]> = [
      ["Imported applicants", applicants.length, Users],
      ["Shortlisted", decisions.filter((item) => item === "shortlist").length, CheckCircle2],
      ["Manual review", decisions.filter((item) => item === "review").length, Clock3],
      ["Rejected", decisions.filter((item) => item === "reject").length, FileWarning],
      ["Failed analyses", applicants.filter((item) => item.processing_status === "failed").length, FileWarning],
      ["Email drafts", emails.filter((item) => item.status === "draft").length, Send]
    ];
    return items;
  }, [applicants, emails]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Multi-pass candidate evaluation"
        title="Dashboard"
        description="Track imports, analysis status, and candidate decisions across active job profiles."
      />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <Card className="min-h-24 transition hover:-translate-y-0.5 hover:border-[#b9ddd5]" key={label as string}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-[#5f6f6b]">{label}</p>
              <Icon className="text-moss" size={20} />
            </div>
            <p className="mt-3 text-2xl font-black">{value}</p>
          </Card>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Recent jobs</h2>
            <Link className="text-sm font-semibold text-moss" href="/jobs">Manage</Link>
          </div>
          <div className="mt-4 space-y-3">
            {jobs.slice(0, 5).map((job) => (
              <Link className="flex items-center justify-between gap-4 rounded-lg border border-line bg-paper/70 p-4 transition hover:border-[#b9ddd5] hover:bg-white hover:shadow-[0_14px_36px_rgba(21,36,38,0.08)]" href={`/jobs?job=${job.id}`} key={job.id}>
                <div>
                <p className="font-bold">{job.title}</p>
                <p className="text-sm text-[#63736f]">{job.role_level} | {job.status}</p>
                </div>
                <ArrowRight size={16} className="text-moss" />
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Recent applicants</h2>
            <Link className="text-sm font-semibold text-moss" href="/applicants">Review</Link>
          </div>
          <div className="mt-4 space-y-3">
            {applicants.slice(0, 6).map((applicant) => (
              <Link className="flex items-center justify-between gap-4 rounded-lg border border-line bg-paper/70 p-4 transition hover:border-[#b9ddd5] hover:bg-white hover:shadow-[0_14px_36px_rgba(21,36,38,0.08)]" href={`/applicants/${applicant.id}`} key={applicant.id}>
                <div>
                <p className="font-bold">{applicant.candidate_name ?? "Unnamed candidate"}</p>
                <p className="text-sm text-[#63736f]">{applicant.system_outputs?.final_candidate_score ?? "No score"} | {applicant.processing_status}</p>
                </div>
                <ArrowRight size={16} className="text-moss" />
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
