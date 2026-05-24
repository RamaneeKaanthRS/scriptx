const API_BASE = '/api';

const getAuthUserId = (): string | null => {
  try {
    const stored = localStorage.getItem('local_user');
    if (stored) {
      const user = JSON.parse(stored);
      return user.id || null;
    }
  } catch (e) {
    console.error('Failed to parse local user session:', e);
  }
  return null;
};

export interface AnalysisResponse {
  genre: string;
  structure: string;
  predictedQuality: number;
  intelligentScore: number;
  weaknesses: {
    category: string;
    description: string;
    severity: number;
  }[];
  recommendations: {
    issue: string;
    recommendation: string;
  }[];
  emotionalCurve: {
    timestamp: number;
    sentiment: number;
  }[];
}

export const uploadScript = async (file: File): Promise<string> => {
  const userId = getAuthUserId();
  const formData = new FormData();
  formData.append('file', file);
  if (userId) {
    formData.append('user_id', userId);
  }

  const response = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to analyze script');
  }

  const data = await response.json();
  return data.script_id;
};

export const getDashboardScripts = async () => {
  const userId = getAuthUserId();
  const headers: Record<string, string> = {};
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const response = await fetch(`${API_BASE}/scripts`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch scripts');
  }
  return response.json();
};

export const getAnalysisReport = async (scriptId: string) => {
  const userId = getAuthUserId();
  const headers: Record<string, string> = {};
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const response = await fetch(`${API_BASE}/analyses/${scriptId}`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch analysis report');
  }
  return response.json();
};
