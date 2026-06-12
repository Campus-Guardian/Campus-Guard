class AnalysisService {
  isPointInPolygon(point, polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      const intersects = ((yi > py) !== (yj > py))
        && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  accelerationMagnitude(event) {
    if (event.acceleration_magnitude != null) return event.acceleration_magnitude;
    const { acceleration_x: x, acceleration_y: y, acceleration_z: z } = event;
    if ([x, y, z].some((value) => value == null)) return null;
    return Math.sqrt(x * x + y * y + z * z);
  }

  hasSpeedViolation(current, previous, settings) {
    if (!current || !previous) return false;
    const accurate = [current, previous].every((event) => (
      event.speed != null
      && event.location_accuracy != null
      && event.location_accuracy <= settings.max_location_accuracy_m
    ));
    if (!accurate) return false;
    return current.speed > settings.speed_limit_kmh
      && previous.speed > settings.speed_limit_kmh
      && new Date(current.measured_at) - new Date(previous.measured_at) <= 15000;
  }

  hasFallImpact(current, previousEvents) {
    const currentMagnitude = this.accelerationMagnitude(current);
    if (currentMagnitude == null || currentMagnitude < 20) return false;
    const currentTime = new Date(current.measured_at).getTime();
    return previousEvents.some((event) => {
      const magnitude = this.accelerationMagnitude(event);
      const age = currentTime - new Date(event.measured_at).getTime();
      return magnitude != null && magnitude < 3 && age >= 0 && age <= 3000;
    });
  }
}

module.exports = new AnalysisService();
