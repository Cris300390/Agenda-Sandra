import { useEffect, useState } from "react";
import * as Students from "../data/supaStudents";
import type { StudentApp as Student } from "../data/supaStudents";

export type Option = { value: number; label: string };

export function useStudentsOptions() {
  const [options, setOptions] = useState<Option[]>([]);
  useEffect(() => {
    (async () => {
      const list = await Students.list();
      const activos = list
        .filter((s: Student) => s.active)
        .sort((a: Student, b: Student) => a.name.localeCompare(b.name, "es"));
      setOptions(activos.map((s: Student) => ({ value: Number(s.id), label: s.name })));
    })();
  }, []);
  return options;
}
