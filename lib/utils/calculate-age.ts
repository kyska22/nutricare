export function calculateAge(birthDate: string, today = new Date()): number | null {
  const [year, month, day] = birthDate.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const birth = new Date(year, month - 1, day);
  if (
    birth.getFullYear() !== year ||
    birth.getMonth() !== month - 1 ||
    birth.getDate() !== day ||
    birth > today
  ) {
    return null;
  }

  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() > month - 1 ||
    (today.getMonth() === month - 1 && today.getDate() >= day);

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age;
}
