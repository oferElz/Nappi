import { api } from './client';
import type {
  SignUpRequest,
  SignUpResponse,
  SignInRequest,
  SignInResponse,
  RegisterBabyRequest,
  changePasswordRequest,
  changePasswordResponse,
  BabyNote,
  NotesListResponse,
  NoteCreateRequest,
  NoteUpdateRequest,
} from '../types/auth';

export const authApi = {
  signup: (data: SignUpRequest) =>
    api.post<SignUpResponse>('/auth/signup', data),

  signin: (data: SignInRequest) =>
    api.post<SignInResponse>('/auth/signin', data),

  registerBaby: (data: RegisterBabyRequest) =>
    api.post<SignInResponse>('/auth/register-baby', data),

  changePassword: (data: changePasswordRequest) =>
    api.post<changePasswordResponse>('/auth/change-password', data),
};

// Baby notes API endpoints (multi-note system)
export const babiesApi = {
  // List all notes for a baby
  getNotes: (babyId: number, userId: number) =>
    api.get<NotesListResponse>(`/babies/${babyId}/notes`, {
      params: { user_id: userId },
    }),

  // Create a new note
  createNote: (babyId: number, userId: number, data: NoteCreateRequest) =>
    api.post<BabyNote>(`/babies/${babyId}/notes`, data, {
      params: { user_id: userId },
    }),

  // Update an existing note
  updateNote: (babyId: number, noteId: number, userId: number, data: NoteUpdateRequest) =>
    api.put<BabyNote>(`/babies/${babyId}/notes/${noteId}`, data, {
      params: { user_id: userId },
    }),

  // Delete a note
  deleteNote: (babyId: number, noteId: number, userId: number) =>
    api.delete<{ success: boolean; message: string }>(`/babies/${babyId}/notes/${noteId}`, {
      params: { user_id: userId },
    }),
};

