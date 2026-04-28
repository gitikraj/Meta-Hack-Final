export interface LogEntry {
  id: number;
  ts: string;
  tag: string;
  message: string;
  trigger?: boolean;
}

export interface AgentStatus {
  key: string;
  name: string;
  role: string;
  icon: string;
  status: "queued" | "running" | "done" | "failed";
  detail: string;
}

export interface RLFeedback {
  episode_id: number;
  shaped_reward: number;
  raw_overall: number;
  verdict: string;
  weakest_dimension: string;
  strongest_dimension: string;
  dimension_scores: Record<string, number>;
  streak: number;
  buffer_size: number;
  avg_score: number;
  pass_rate: number;
}

export interface RLStatus {
  status: string;
  episode: number;
  max_episodes: number;
  current_score: number;
  buffer_size: number;
  avg_score: number;
  pass_rate: number;
  score_trajectory: number[];
  dimension_averages: Record<string, number>;
  summary?: Record<string, unknown>;
  error?: string;
}

export interface PipelineResult {
  run_id: string;
  status: "running" | "completed" | "failed";
  stage?: string;
  agents?: AgentStatus[];
  scores?: {
    overall: number;
    algorithmic_total: number;
    technique_match: number;
    ioc_match: number;
    action_match: number;
    root_cause_match: number;
    blast_radius_match: number;
    completeness: number;
    qualitative_total: number;
    reasoning_quality: number;
    actionability: number;
    technical_depth: number;
  };
  verdict?: string;
  strengths?: string;
  gaps?: string;
  recommendation?: string;
  agent_confidence?: Record<string, string>;
  processing_times_ms?: Record<string, number>;
  rl_feedback?: RLFeedback;
}

export interface DocEntry {
  id: number;
  name: string;
  size: string;
  type: string;
  sens: string;
}

export type PipelineRun = {
  id: string;
  type: string;
  detail: string;
  meta: Record<string, unknown>;
  startedAt: number;
};
