export const API_URL = 'https://script.google.com/macros/s/AKfycbwH8pTrhJOyHCQFCVrRzw1QHIfdORRCuOD8EJWlsxT5bGACQlkyMGd8f7X5-ZwKf4by/exec';

export async function postToGoogleAppsScript(payload, options = {}) {
  const timeoutMs = options.timeoutMs || 20000;

  if (!API_URL || API_URL.includes('PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
    throw new Error('Please configure the Google Apps Script Web App URL in src/config/api.js before using the backend.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const result = await response.json();

    if (!result || typeof result !== 'object') {
      throw new Error('Invalid backend response format.');
    }

    if (result.success === false) {
      const backendMessage = typeof result.message === 'string' && result.message.trim()
        ? result.message
        : 'Google Apps Script backend rejected the request.';
      throw new Error(backendMessage);
    }

    return result;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timed out while contacting the Google Apps Script Web App URL. Check the backend URL in src/config/api.js and the network connection.');
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Network error while contacting the Google Apps Script Web App URL. Check the backend URL in src/config/api.js.');
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiRequest = postToGoogleAppsScript;
