export interface Baby {
  id: number;
  first_name: string;
  last_name: string;
  birthdate: string;
}

export interface AuthUser {
  user_id: number;
  username: string;
  baby_id: number | null;
  baby: Baby | null;
  first_name: string;
  last_name: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  repeat_password: string;
  first_name: string;
  last_name: string;
  baby_first_name?: string;
  baby_birthdate?: string;
}

export interface SignUpResponse {
  user_id: number;
  username: string;
  baby_registered: boolean;
  baby: Baby | null;
  message: string;
  first_name: string;
  last_name: string;
}

export interface SignInRequest {
  username: string;
  password: string;
}

export interface SignInResponse {
  user_id: number;
  username: string;
  baby_id: number | null;
  baby: Baby | null;
  message: string;
  first_name: string;
  last_name: string;
}

export interface RegisterBabyRequest {
  user_id: number;
  first_name: string;
  birthdate: string;
  gender?: string;
}

export interface changePasswordRequest {
  user_id: number;
  old_password: string;
  new_password: string;
}

export interface changePasswordResponse {
  password_changed: boolean;
}

// Baby notes (multi-note system)
export interface BabyNote {
  id: number;
  baby_id: number;
  title: string;
  content: string;
  created_at?: string;
  updated_at?: string;
}

export interface NotesListResponse {
  baby_id: number;
  notes: BabyNote[];
}

export interface NoteCreateRequest {
  title: string;
  content: string;
}

export interface NoteUpdateRequest {
  title: string;
  content: string;
}