export function calcBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180
  const la1 = lat1 * Math.PI / 180
  const la2 = lat2 * Math.PI / 180
  const x = Math.sin(dLng) * Math.cos(la2)
  const y = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLng)
  let bearing = Math.atan2(x, y) * 180 / Math.PI
  return (bearing + 360) % 360
}

export function bearingToHebrew(bearing: number): string {
  const dirs = ['צפונה', 'צפון-מזרח', 'מזרחה', 'דרום-מזרח', 'דרומה', 'דרום-מערב', 'מערבה', 'צפון-מערב']
  const idx = Math.round(bearing / 45) % 8
  return dirs[idx]
}
