import { chatApi } from './client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  baby_id: number;
  user_id: number;
  message: string;
  history: ChatMessage[];
}

export interface ChatResponse {
  response: string;
}

/**
 * Send a chat message to the AI and get a response.
 * 
 * The AI has full context about the baby including:
 * - Profile and parent notes
 * - Sleep patterns and statistics
 * - Optimal conditions
 * - Recent awakenings and correlations
 * 
 * @param request - The chat request with baby_id, user_id, message, and history
 * @returns The AI-generated response string
 */
export async function sendChatMessage(request: ChatRequest): Promise<string> {
  const res = await chatApi.post<ChatResponse>('/chat', request);
  return res.data.response;
}
