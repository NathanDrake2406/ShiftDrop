// In a real app, this would come from process.env
// For this demo, we assume the environment variable is injected by the runner
export const API_KEY = process.env.API_KEY || '';

export const MOCK_MANAGER_ID = 'auth0|manager123';
export const APP_NAME = 'ShiftDrop';

export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};
