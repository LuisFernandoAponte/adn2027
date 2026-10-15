export const formatAMPM = (time?: string | null): string => {
  if (!time) return '';
  const parts = time.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return time;
  const [h, m] = parts;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
};
