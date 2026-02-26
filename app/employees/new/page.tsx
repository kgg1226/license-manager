// 변경: 서버 컴포넌트로 분리 — OrgCompany 목록을 페치해 NewEmployeeForm에 전달

import { prisma } from "@/lib/prisma";
import NewEmployeeForm from "./new-employee-form";

export default async function NewEmployeePage() {
  const companies = await prisma.orgCompany.findMany({
    include: {
      orgs: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return <NewEmployeeForm companies={companies} />;
}
