export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const USERNAME = /^[a-zA-Z0-9._-]+$/;
export function accountEmail(username: string) { return `${username.toLowerCase()}@accounts.aru.invalid`; }
export function validCoordinates(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90 && typeof lng === 'number' && Number.isFinite(lng) && Math.abs(lng) <= 180;
}
export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = (d: number) => d * Math.PI / 180;
  const a = Math.sin(rad(lat2-lat1)/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(rad(lng2-lng1)/2)**2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1-a)));
}
export interface LocationProof { latitude: number; longitude: number; accuracy: number; timestamp: number }
export function locationError(location: LocationProof, event: { latitude: number | null; longitude: number | null; radius_meters: number }, now = Date.now()): string | null {
  if (!location || !validCoordinates(location.latitude, location.longitude) || !Number.isFinite(location.accuracy) || location.accuracy < 0 || !Number.isFinite(location.timestamp)) return 'ข้อมูลตำแหน่งไม่ถูกต้อง กรุณาติดต่อทีมงาน';
  if (!validCoordinates(event.latitude, event.longitude)) return 'กิจกรรมยังไม่ได้กำหนดสถานที่ กรุณาติดต่อทีมงาน';
  if (now-location.timestamp > 30_000 || location.timestamp > now+5_000) return 'ตำแหน่งหมดอายุ กรุณาตรวจสอบ GPS ใหม่';
  if (location.accuracy > Math.min(event.radius_meters, 100)) return 'GPS ยังไม่แม่นยำพอ กรุณาลองในพื้นที่เปิดโล่ง หรือติดต่อทีมงาน';
  if (haversineMeters(location.latitude, location.longitude, event.latitude!, event.longitude!) > event.radius_meters) return 'คุณอยู่นอกรัศมีกิจกรรม กรุณาเข้าใกล้สถานที่จัดงานหรือติดต่อทีมงาน';
  return null;
}
