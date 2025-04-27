export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      talents: {
        Row: {
          id: string
          full_name: string
          email: string | null
          location: string | null
          headline: string | null
          summary: string | null
          years_of_experience: number | null
          current_title: string | null
          current_company: string | null
          skills: string[] | null
          industries: string[] | null
          seniority_level: string | null
          education: Json[] | null
          work_experience: Json[] | null
          achievements: string[] | null
          remote_preference: string | null
          job_types: string[] | null
          desired_roles: string[] | null
          desired_industries: string[] | null
          salary_expectation_range: Json | null
          profile_strength: number | null
          linkedin_url: string | null
          github_url: string | null
          portfolio_url: string | null
          is_verified: boolean | null
          last_active: string | null
        }
        Insert: {
          id?: string
          full_name: string
          email?: string | null
          location?: string | null
          headline?: string | null
          summary?: string | null
          years_of_experience?: number | null
          current_title?: string | null
          current_company?: string | null
          skills?: string[] | null
          industries?: string[] | null
          seniority_level?: string | null
          education?: Json[] | null
          work_experience?: Json[] | null
          achievements?: string[] | null
          remote_preference?: string | null
          job_types?: string[] | null
          desired_roles?: string[] | null
          desired_industries?: string[] | null
          salary_expectation_range?: Json | null
          profile_strength?: number | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          is_verified?: boolean | null
          last_active?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string | null
          location?: string | null
          headline?: string | null
          summary?: string | null
          years_of_experience?: number | null
          current_title?: string | null
          current_company?: string | null
          skills?: string[] | null
          industries?: string[] | null
          seniority_level?: string | null
          education?: Json[] | null
          work_experience?: Json[] | null
          achievements?: string[] | null
          remote_preference?: string | null
          job_types?: string[] | null
          desired_roles?: string[] | null
          desired_industries?: string[] | null
          salary_expectation_range?: Json | null
          profile_strength?: number | null
          linkedin_url?: string | null
          github_url?: string | null
          portfolio_url?: string | null
          is_verified?: boolean | null
          last_active?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 