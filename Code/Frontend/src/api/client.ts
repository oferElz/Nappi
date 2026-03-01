import axios from 'axios';
import { API_STANDARD_TIMEOUT_MS, API_CHAT_TIMEOUT_MS } from '../constants';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_STANDARD_TIMEOUT_MS,
});

// Longer timeout for AI chat which can take time to generate responses
export const chatApi = axios.create({
  baseURL: BASE_URL,
  timeout: API_CHAT_TIMEOUT_MS,
});
