/**
 * Geometry utilities for DharaDrishti.
 *
 * All algorithms are implemented with raw math so we avoid a
 * turf.js runtime dependency.  Coordinate convention follows
 * Leaflet: [lat, lng] (degrees).
 */

// ── helpers ──────────────────────────────────────────────────────

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_M = 6_371_000; // mean Earth radius in metres
const SQ_METRES_PER_ACRE = 4_046.856_422_4;

// ── public API ───────────────────────────────────────────────────

/**
 * Calculate the area of a polygon on the Earth's surface.
 *
 * Uses the Shoelace (Gauss) formula on coordinates that have been
 * projected to metres via a local tangent-plane approximation,
 * then converts to **acres**.
 *
 * @param coords Ring of [lat, lng] pairs (first ≠ last; the ring
 *               is closed automatically).
 * @returns Area in **acres**.
 */
export function calculateArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;

  // Close the ring if necessary
  const ring = [...coords];
  const [firstLat, firstLng] = ring[0];
  const [lastLat, lastLng] = ring[ring.length - 1];
  if (firstLat !== lastLat || firstLng !== lastLng) {
    ring.push([firstLat, firstLng]);
  }

  // Reference point for projection (centroid of first three verts)
  const refLat =
    (ring[0][0] + ring[1][0] + ring[2][0]) / 3;

  // Project to flat metres
  const projected = ring.map(([lat, lng]) => {
    const x = (lng - ring[0][1]) * DEG_TO_RAD * EARTH_RADIUS_M * Math.cos(refLat * DEG_TO_RAD);
    const y = (lat - ring[0][0]) * DEG_TO_RAD * EARTH_RADIUS_M;
    return [x, y] as [number, number];
  });

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < projected.length - 1; i++) {
    const [x1, y1] = projected[i];
    const [x2, y2] = projected[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  area = Math.abs(area) / 2;

  return area / SQ_METRES_PER_ACRE;
}

/**
 * Ray-casting algorithm to determine whether a **point** lies
 * inside a **polygon**.
 *
 * @param point  [lat, lng]
 * @param polygon Array of [lat, lng] pairs defining the boundary.
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [py, px] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [iy, ix] = polygon[i];
    const [jy, jx] = polygon[j];

    const intersects =
      iy > py !== jy > py &&
      px < ((jx - ix) * (py - iy)) / (jy - iy) + ix;

    if (intersects) inside = !inside;
  }

  return inside;
}

/**
 * Return the centroid (geometric centre) of a simple polygon.
 *
 * @param coords Array of [lat, lng] pairs.
 * @returns [lat, lng] of the centroid.
 */
export function getPolygonCentroid(
  coords: [number, number][],
): [number, number] {
  if (coords.length === 0) return [0, 0];
  if (coords.length === 1) return coords[0];

  // Close the ring
  const ring = [...coords];
  const [fl, fg] = ring[0];
  const [ll, lg] = ring[ring.length - 1];
  if (fl !== ll || fg !== lg) {
    ring.push([fl, fg]);
  }

  let cx = 0;
  let cy = 0;
  let signedArea = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [y0, x0] = ring[i];
    const [y1, x1] = ring[i + 1];
    const a = x0 * y1 - x1 * y0;
    signedArea += a;
    cx += (x0 + x1) * a;
    cy += (y0 + y1) * a;
  }

  signedArea *= 0.5;

  if (Math.abs(signedArea) < 1e-12) {
    // Degenerate polygon – fall back to arithmetic mean
    const avgLat = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const avgLng = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return [avgLat, avgLng];
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;

  return [cy, cx]; // [lat, lng]
}

/**
 * Douglas-Peucker path simplification.
 *
 * @param coords  Array of [lat, lng] pairs.
 * @param tolerance Maximum allowed perpendicular distance (in
 *                  degrees — a small value like 0.00005 works well
 *                  for GPS tracks).
 */
export function simplifyPath(
  coords: [number, number][],
  tolerance: number,
): [number, number][] {
  if (coords.length <= 2) return coords;

  // Find the point with the maximum distance from the line
  // between the first and last point.
  let maxDist = 0;
  let maxIdx = 0;

  const [startLat, startLng] = coords[0];
  const [endLat, endLng] = coords[coords.length - 1];

  for (let i = 1; i < coords.length - 1; i++) {
    const d = perpendicularDistance(
      coords[i],
      [startLat, startLng],
      [endLat, endLng],
    );
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(coords.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(coords.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [coords[0], coords[coords.length - 1]];
}

/**
 * Filter out GPS fixes whose reported accuracy exceeds a threshold.
 *
 * @param coords     Array of { lat, lng, accuracy } objects.
 * @param maxAccuracy Maximum acceptable accuracy in metres.
 * @returns Filtered array of { lat, lng } objects.
 */
export function filterWeakGPSFixes(
  coords: { lat: number; lng: number; accuracy: number }[],
  maxAccuracy: number,
): { lat: number; lng: number }[] {
  return coords
    .filter((c) => c.accuracy <= maxAccuracy)
    .map(({ lat, lng }) => ({ lat, lng }));
}

/**
 * Haversine distance between two points on the Earth.
 *
 * @param a [lat, lng] in degrees.
 * @param b [lat, lng] in degrees.
 * @returns Distance in **metres**.
 */
export function distanceBetween(
  a: [number, number],
  b: [number, number],
): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;

  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);

  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      sinHalfLon *
      sinHalfLon;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// ── internal helpers ─────────────────────────────────────────────

/**
 * Perpendicular distance from a point to a line segment defined by
 * two endpoints.  All values in degrees (for use in Douglas-Peucker
 * where the tolerance is also in degrees).
 */
function perpendicularDistance(
  point: [number, number],
  lineStart: [number, number],
  lineEnd: [number, number],
): number {
  const [py, px] = point;
  const [sy, sx] = lineStart;
  const [ey, ex] = lineEnd;

  const dx = ex - sx;
  const dy = ey - sy;

  if (dx === 0 && dy === 0) {
    // Start and end are the same point
    return Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
  }

  const num = Math.abs(dy * px - dx * py + ex * sy - ey * sx);
  const den = Math.sqrt(dx * dx + dy * dy);
  return num / den;
}
