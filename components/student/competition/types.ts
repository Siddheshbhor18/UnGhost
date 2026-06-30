export interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  course: string;
  year: string;
  githubId: string;
  linkedinId: string;
}

export interface SubmissionData {
  githubRepo: string;
  liveLink: string;
  description: string;
}

export type Step = "landing" | "register_step1" | "register_step2" | "registered_hub" | "submitted";
