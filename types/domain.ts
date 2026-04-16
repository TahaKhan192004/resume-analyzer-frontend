export type JobProfile = {
  id: string;
  title: string;
  department?: string;
  employment_type?: string;
  role_level?: string;
  location?: string;
  status: string;
  summary?: string;
  description?: string;
  success_definition?: string;
  responsibilities?: string;
  practical_capabilities?: string;
  requirements?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
  prompt_controls?: Record<string, unknown>;
  rubrics?: Rubric[];
};

export type Rubric = {
  dimension: string;
  weight: number;
  instructions: string;
  low_description?: string;
  mid_description?: string;
  high_description?: string;
  red_flag_guidance?: string;
  confidence_guidance?: string;
  enabled: boolean;
};

export type SystemOutputs = {
  resume_analysis_status?: string;
  final_candidate_score?: number | string;
  final_candidate_decision?: string;
  candidate_fit_summary?: string;
  top_strengths?: string[] | string;
  top_gaps?: string[] | string;
  best_project_relevance?: string;
  interview_recommendation?: string;
  interview_focus_areas?: string[] | string;
  ai_notes?: string;
};

export type DimensionResult = {
  id?: string;
  dimension?: string;
  score?: number | string;
  confidence?: number | string;
  result_json?: {
    reasoning?: string;
    evidence?: string[];
    red_flags?: string[];
    missing_information?: string[];
  } & Record<string, unknown>;
};

export type Applicant = {
  id: string;
  job_id?: string;
  application_id?: string;
  candidate_name?: string;
  candidate_email?: string;
  applied_role?: string;
  processing_status: string;
  review_status?: string;
  candidate_stage?: string;
  original_data?: Record<string, unknown>;
  system_outputs: SystemOutputs;
  resume?: Record<string, unknown>;
  profile?: { profile_json?: unknown } & Record<string, unknown>;
  dimension_results?: DimensionResult[];
  final_evaluation?: {
    summary?: string;
    strengths?: string[];
    gaps?: string[];
    interview_recommendation?: string;
  } & Record<string, unknown>;
  job_title?: string;
  selected_job_analysis?: JobAnalysis;
  job_analyses?: JobAnalysis[];
};

export type JobAnalysis = {
  job_id: string;
  job_title: string;
  run_id?: string;
  status?: string;
  final_score?: number | string | null;
  decision?: string | null;
  summary?: string;
  reason?: string | null;
  matches_applied_role?: boolean;
  role_match_reason?: string;
};

export type CandidateEmail = {
  id: string;
  applicant_id: string;
  job_id: string;
  run_id: string;
  final_evaluation_id: string;
  to_email: string;
  from_email: string;
  subject: string;
  body: string;
  status: "draft" | "sent" | "failed";
  failure_reason?: string | null;
  sent_at?: string | null;
  candidate_name?: string;
  job_title?: string;
  created_at?: string;
  updated_at?: string;
};

export type PromptTemplate = {
  id: string;
  key: string;
  name: string;
  description?: string;
  active_version_id?: string;
  versions?: Array<Record<string, unknown>>;
};
