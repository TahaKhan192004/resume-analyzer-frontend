"use client";

import { useEffect, useState } from "react";
import { BriefcaseBusiness, Pencil, Sparkles, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import type { JobProfile } from "@/types/domain";

type SimpleJobDraft = {
  title: string;
  department: string;
  employment_type: string;
  role_level: string;
  location: string;
  status: string;
  summary: string;
  description: string;
  success_definition: string;
  responsibilities: string;
  practical_capabilities: string;
  essential_skills: string;
  desirable_skills: string;
  tools_platforms: string;
  preferred_domains: string;
  preferred_projects: string;
  preferred_ownership_level: string;
  expected_experience_depth: string;
  education_preferences: string;
  communication_expectations: string;
};

type AiJobDraft = Omit<SimpleJobDraft, "status" | "essential_skills" | "desirable_skills" | "tools_platforms" | "preferred_domains" | "preferred_projects"> & {
  essential_skills: string[];
  desirable_skills: string[];
  tools_platforms: string[];
  preferred_domains: string[];
  preferred_projects: string[];
};

const blankDraft: SimpleJobDraft = {
  title: "",
  department: "",
  employment_type: "Internship",
  role_level: "Intern / Junior",
  location: "",
  status: "active",
  summary: "",
  description: "",
  success_definition: "",
  responsibilities: "",
  practical_capabilities: "",
  essential_skills: "",
  desirable_skills: "",
  tools_platforms: "",
  preferred_domains: "",
  preferred_projects: "",
  preferred_ownership_level: "",
  expected_experience_depth: "",
  education_preferences: "",
  communication_expectations: ""
};

function splitList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function joinList(value?: string[]) {
  return (value ?? []).join(", ");
}

function toPayload(draft: SimpleJobDraft) {
  return {
    title: draft.title.trim(),
    department: draft.department,
    employment_type: draft.employment_type,
    role_level: draft.role_level,
    location: draft.location,
    status: draft.status,
    summary: draft.summary,
    description: draft.description,
    success_definition: draft.success_definition,
    responsibilities: draft.responsibilities,
    practical_capabilities: draft.practical_capabilities,
    requirements: {
      essential_skills: splitList(draft.essential_skills),
      desirable_skills: splitList(draft.desirable_skills),
      tools_platforms: splitList(draft.tools_platforms),
      preferred_domains: splitList(draft.preferred_domains),
      preferred_projects: splitList(draft.preferred_projects),
      preferred_ownership_level: draft.preferred_ownership_level,
      expected_experience_depth: draft.expected_experience_depth,
      education_preferences: draft.education_preferences,
      communication_expectations: draft.communication_expectations
    },
    thresholds: { shortlist: 75, review: 55, reject: 0 },
    prompt_controls: {},
    rubrics: []
  };
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobProfile[]>([]);
  const [draft, setDraft] = useState<SimpleJobDraft>(blankDraft);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    apiFetch<JobProfile[]>("/jobs").then(setJobs).catch(() => setJobs([]));
  }

  useEffect(load, []);

  function setField<K extends keyof SimpleJobDraft>(key: K, value: SimpleJobDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function loadJobForEdit(job: JobProfile) {
    const requirements = job.requirements ?? {};
    const listValue = (value: unknown) => (Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : "");
    setEditingJobId(job.id);
    setMessage("Editing existing job profile.");
    setError("");
    setDraft({
      title: job.title ?? "",
      department: job.department ?? "",
      employment_type: job.employment_type ?? "",
      role_level: job.role_level ?? "",
      location: job.location ?? "",
      status: job.status ?? "active",
      summary: job.summary ?? "",
      description: job.description ?? "",
      success_definition: job.success_definition ?? "",
      responsibilities: job.responsibilities ?? "",
      practical_capabilities: job.practical_capabilities ?? "",
      essential_skills: listValue(requirements.essential_skills),
      desirable_skills: listValue(requirements.desirable_skills),
      tools_platforms: listValue(requirements.tools_platforms),
      preferred_domains: listValue(requirements.preferred_domains),
      preferred_projects: listValue(requirements.preferred_projects),
      preferred_ownership_level: typeof requirements.preferred_ownership_level === "string" ? requirements.preferred_ownership_level : "",
      expected_experience_depth: typeof requirements.expected_experience_depth === "string" ? requirements.expected_experience_depth : "",
      education_preferences: typeof requirements.education_preferences === "string" ? requirements.education_preferences : "",
      communication_expectations: typeof requirements.communication_expectations === "string" ? requirements.communication_expectations : ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setDraft(blankDraft);
    setSourceText("");
    setEditingJobId(null);
    setError("");
    setMessage("");
  }

  function applyAiDraft(result: AiJobDraft) {
    setDraft({
      title: result.title || draft.title,
      department: result.department || draft.department,
      employment_type: result.employment_type || draft.employment_type,
      role_level: result.role_level || draft.role_level,
      location: result.location || draft.location,
      status: draft.status,
      summary: result.summary || draft.summary,
      description: result.description || sourceText || draft.description,
      success_definition: result.success_definition || draft.success_definition,
      responsibilities: result.responsibilities || draft.responsibilities,
      practical_capabilities: result.practical_capabilities || draft.practical_capabilities,
      essential_skills: joinList(result.essential_skills),
      desirable_skills: joinList(result.desirable_skills),
      tools_platforms: joinList(result.tools_platforms),
      preferred_domains: joinList(result.preferred_domains),
      preferred_projects: joinList(result.preferred_projects),
      preferred_ownership_level: result.preferred_ownership_level || draft.preferred_ownership_level,
      expected_experience_depth: result.expected_experience_depth || draft.expected_experience_depth,
      education_preferences: result.education_preferences || draft.education_preferences,
      communication_expectations: result.communication_expectations || draft.communication_expectations
    });
  }

  async function generateDraft() {
    setError("");
    setMessage("");
    if (sourceText.trim().length < 20) {
      setError("Paste the job description first.");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await apiFetch<AiJobDraft>("/jobs/draft-from-description", {
        method: "POST",
        body: JSON.stringify({ description: sourceText })
      });
      applyAiDraft(result);
      setMessage("Draft generated. Review and edit it, then create the job profile.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate the draft.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function save() {
    setError("");
    setMessage("");
    if (!draft.title.trim()) {
      setError("Job title is required.");
      return;
    }
    setIsSaving(true);
    try {
      if (editingJobId) {
        await apiFetch(`/jobs/${editingJobId}`, { method: "PUT", body: JSON.stringify(toPayload(draft)) });
      } else {
        await apiFetch("/jobs", { method: "POST", body: JSON.stringify(toPayload(draft)) });
      }
      const wasEditing = Boolean(editingJobId);
      setDraft(blankDraft);
      setSourceText("");
      setEditingJobId(null);
      setMessage(wasEditing ? "Job profile updated." : "Job profile created.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create job profile.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteJob(job: JobProfile) {
    const ok = window.confirm(`Delete "${job.title}"? This cannot be undone.`);
    if (!ok) return;
    setError("");
    setMessage("");
    try {
      await apiFetch(`/jobs/${job.id}`, { method: "DELETE" });
      if (editingJobId === job.id) resetForm();
      setMessage("Job profile deleted.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete job profile.");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Role expectations"
        title="Job profiles"
        description="Paste a full job description, let AI fill the profile, then edit only what matters. Prompts and rubrics stay coded in the backend."
      />

      <Card>
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#b9ddd5] bg-[#e9f8f4] text-moss shadow-[0_12px_28px_rgba(20,122,108,0.14)]">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="font-black">AI fill from job description</h2>
            <p className="text-sm text-[#5f6f6b]">Paste everything you have. The generated profile remains editable.</p>
          </div>
        </div>
        <Textarea
          className="min-h-44"
          placeholder="Paste full job description, responsibilities, requirements, and your hiring notes here..."
          value={sourceText}
          onChange={(event) => setSourceText(event.target.value)}
        />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[#5f6f6b]">Tip: include what matters most, such as self-projects, skills, and whether experience is required.</p>
          <Button onClick={generateDraft} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate editable profile"}</Button>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-center gap-3 border-b border-line pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#b9ddd5] bg-[#e9f8f4] text-moss shadow-[0_12px_28px_rgba(20,122,108,0.14)]">
            <BriefcaseBusiness size={20} />
          </div>
          <div>
            <h2 className="font-black">{editingJobId ? "Edit job profile" : "Review job profile"}</h2>
            <p className="text-sm text-[#5f6f6b]">Only title is required. Add details where useful.</p>
          </div>
        </div>

        {(error || message) && (
          <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-[#efc6bd] bg-[#fff1ee] text-[#8a352b]" : "border-[#c8dfd4] bg-[#edf8f2] text-[#245b45]"}`}>
            {error || message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <Input placeholder="Job title" value={draft.title} onChange={(event) => setField("title", event.target.value)} />
          <Input placeholder="Department" value={draft.department} onChange={(event) => setField("department", event.target.value)} />
          <Input placeholder="Location" value={draft.location} onChange={(event) => setField("location", event.target.value)} />
          <Input placeholder="Employment type" value={draft.employment_type} onChange={(event) => setField("employment_type", event.target.value)} />
          <Input placeholder="Role level" value={draft.role_level} onChange={(event) => setField("role_level", event.target.value)} />
          <select className="focus-ring min-h-10 rounded-md border border-line bg-white px-3 text-sm" value={draft.status} onChange={(event) => setField("status", event.target.value)}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Textarea className="min-h-28" placeholder="Short role summary" value={draft.summary} onChange={(event) => setField("summary", event.target.value)} />
          <Textarea className="min-h-28" placeholder="What success in this role looks like" value={draft.success_definition} onChange={(event) => setField("success_definition", event.target.value)} />
          <Textarea className="min-h-32" placeholder="Essential skills, separated by commas or new lines" value={draft.essential_skills} onChange={(event) => setField("essential_skills", event.target.value)} />
          <Textarea className="min-h-32" placeholder="Preferred project types" value={draft.preferred_projects} onChange={(event) => setField("preferred_projects", event.target.value)} />
        </div>

        <details className="mt-5 rounded-lg border border-line bg-paper/80 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-moss">More details</summary>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Textarea className="min-h-36" placeholder="Full job description" value={draft.description} onChange={(event) => setField("description", event.target.value)} />
            <Textarea className="min-h-36" placeholder="Important responsibilities" value={draft.responsibilities} onChange={(event) => setField("responsibilities", event.target.value)} />
            <Textarea className="min-h-28" placeholder="Practical capabilities expected" value={draft.practical_capabilities} onChange={(event) => setField("practical_capabilities", event.target.value)} />
            <Textarea className="min-h-28" placeholder="Desirable skills" value={draft.desirable_skills} onChange={(event) => setField("desirable_skills", event.target.value)} />
            <Textarea className="min-h-28" placeholder="Tools, platforms, frameworks" value={draft.tools_platforms} onChange={(event) => setField("tools_platforms", event.target.value)} />
            <Textarea className="min-h-28" placeholder="Preferred domains or industries" value={draft.preferred_domains} onChange={(event) => setField("preferred_domains", event.target.value)} />
            <Input placeholder="Preferred ownership level" value={draft.preferred_ownership_level} onChange={(event) => setField("preferred_ownership_level", event.target.value)} />
            <Input placeholder="Expected experience depth" value={draft.expected_experience_depth} onChange={(event) => setField("expected_experience_depth", event.target.value)} />
            <Input placeholder="Education preferences" value={draft.education_preferences} onChange={(event) => setField("education_preferences", event.target.value)} />
            <Input placeholder="Language or communication expectations" value={draft.communication_expectations} onChange={(event) => setField("communication_expectations", event.target.value)} />
          </div>
        </details>

        <div className="mt-5 flex justify-end">
          <div className="flex gap-3">
            {editingJobId && <Button className="bg-[#4d5752] hover:bg-[#3c4541]" onClick={resetForm}>Cancel edit</Button>}
            <Button onClick={save} disabled={isSaving}>{isSaving ? "Saving..." : editingJobId ? "Update job profile" : "Create job profile"}</Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {jobs.map((job) => (
          <Card className="transition hover:-translate-y-0.5 hover:border-[#b9ddd5]" key={job.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black">{job.title}</p>
                <p className="mt-1 text-sm text-[#5f6f6b]">{job.department} | {job.role_level} | {job.status}</p>
              </div>
              <div className="flex gap-2">
                <button className="focus-ring rounded-lg border border-line p-2 text-moss hover:bg-paper" onClick={() => loadJobForEdit(job)} title="Edit job">
                  <Pencil size={16} />
                </button>
                <button className="focus-ring rounded-lg border border-line p-2 text-coral hover:bg-[#fff1ee]" onClick={() => deleteJob(job)} title="Delete job">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6">{job.summary}</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
