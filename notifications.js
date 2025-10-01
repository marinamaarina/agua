let timerId = null;

/* ...existing code... */
export async function requestPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

export function scheduleReminders(intervalMinutes, payloadBuilder) {
  cancelReminders();
  if (!intervalMinutes || intervalMinutes <= 0) return;
  timerId = setInterval(() => {
    const text = payloadBuilder && payloadBuilder();
    if (!text) return;
    try {
      new Notification('H2O Habits', { body: text });
    } catch {
      // Fallback: alert bar
      console.log('Reminder:', text);
    }
  }, intervalMinutes * 60000);
}

export function cancelReminders() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}
/* ...existing code... */

