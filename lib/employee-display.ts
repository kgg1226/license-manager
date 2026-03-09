/**
 * 구성원 표시명을 반환합니다.
 * 같은 이름이 여러 명인 경우, 이메일 앞부분을 추가합니다.
 */
export function getEmployeeDisplayName(
  employee: { id: number; name: string; email: string | null },
  allEmployees: Array<{ id: number; name: string; email: string | null }>
): string {
  const duplicates = allEmployees.filter((e) => e.name === employee.name);

  // 중복되는 이름이 없으면 이름만 반환
  if (duplicates.length <= 1) {
    return employee.name;
  }

  // 중복되는 경우, 이메일 앞부분을 추가
  if (employee.email) {
    const emailPrefix = employee.email.split("@")[0];
    return `${employee.name} (${emailPrefix})`;
  }

  // 이메일이 없으면 ID로 구분
  return `${employee.name} (#${employee.id})`;
}

/**
 * 여러 구성원의 표시명을 일괄 계산합니다.
 */
export function getEmployeeDisplayNames(
  employees: Array<{ id: number; name: string; email: string | null }>
): Record<number, string> {
  const result: Record<number, string> = {};
  for (const emp of employees) {
    result[emp.id] = getEmployeeDisplayName(emp, employees);
  }
  return result;
}
