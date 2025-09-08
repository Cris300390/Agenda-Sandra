// Simple holiday utility for Spain national + Mairena del Alcor (Sevilla)
// Not exhaustive; includes principales festivos fijos y móviles aproximados.

export function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function easterSunday(year: number): Date {
  // Meeus/Jones/Butcher algorithm
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

export function getSpainAndMairenaHolidays(year: number): Date[] {
  const list: Date[] = []
  // Nacionales fijos
  list.push(new Date(year, 0, 1))   // Año Nuevo
  list.push(new Date(year, 0, 6))   // Reyes
  list.push(new Date(year, 4, 1))   // Día del Trabajo
  list.push(new Date(year, 7, 15))  // Asunción
  list.push(new Date(year, 9, 12))  // Fiesta Nacional
  list.push(new Date(year, 10, 1))  // Todos los Santos
  list.push(new Date(year, 11, 6))  // Constitución
  list.push(new Date(year, 11, 8))  // Inmaculada
  list.push(new Date(year, 11, 25)) // Navidad

  // Semana Santa (aproximación: Jueves y Viernes Santos)
  const easter = easterSunday(year)
  const thursday = new Date(easter)
  thursday.setDate(easter.getDate() - 3)
  const friday = new Date(easter)
  friday.setDate(easter.getDate() - 2)
  list.push(thursday, friday)

  // Andalucía Day (28 feb)
  list.push(new Date(year, 1, 28))

  // Fiestas locales Mairena del Alcor (aprox.): Feria de Abril (viernes feria)
  // Para simplicidad marcamos 1er viernes de abril y Lunes de Resaca (lunes siguiente)
  const aprilFirst = new Date(year, 3, 1)
  const firstFridayOffset = (5 - aprilFirst.getDay() + 7) % 7 // 5=viernes
  const feriaFriday = new Date(year, 3, 1 + firstFridayOffset)
  const resacaMonday = new Date(feriaFriday)
  resacaMonday.setDate(feriaFriday.getDate() + 3)
  list.push(feriaFriday, resacaMonday)

  return list
}

export function isHoliday(date: Date): boolean {
  const holidays = getSpainAndMairenaHolidays(date.getFullYear())
  return holidays.some(d => isSameDate(d, date))
}




