export const CURSOR_COLORS = ['#F43F7A', '#818CF8', '#38BDF8', '#34D399', '#FB923C', '#A78BFA', '#FBBF24', '#4ADE80'];

export function getCursorColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
