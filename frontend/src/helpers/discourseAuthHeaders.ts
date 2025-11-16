import { decodeToken } from './token';

export function getDiscourseAuthHeaders(token?: string | null) {
  if (!token) {
    return {};
  }

  const headers: Record<string, string> = {
    Authorization: token,
  };

  const userApiKey = decodeToken(token);
  if (userApiKey) {
    headers['User-Api-Key'] = userApiKey;
  }

  return headers;
}

