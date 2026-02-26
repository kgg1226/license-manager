"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Building2, Users } from "lucide-react";

type OrgUnit = { id: number; name: string; parentId: number | null };
type Company = { id: number; name: string; orgs: OrgUnit[] };

function OrgUnitNode({ unit, subUnits }: { unit: OrgUnit; subUnits: OrgUnit[] }) {
  const [open, setOpen] = useState(true);
  const hasChildren = subUnits.length > 0;

  return (
    <div className="ml-4">
      <div
        className="flex cursor-pointer items-center gap-1.5 py-1 text-gray-700 hover:text-blue-600"
        onClick={() => hasChildren && setOpen(!open)}
      >
        {hasChildren ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="text-sm">{unit.name}</span>
      </div>
      {open && hasChildren && (
        <div>
          {subUnits.map((s) => (
            <OrgUnitNode key={s.id} unit={s} subUnits={[]} />
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyNode({ company }: { company: Company }) {
  const [open, setOpen] = useState(true);
  const topOrgs = company.orgs.filter((o) => o.parentId === null);

  return (
    <div className="mb-4 rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
      <div
        className="flex cursor-pointer items-center gap-2 p-4"
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
        )}
        <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
        <span className="font-medium text-gray-900">{company.name}</span>
        <span className="ml-auto text-xs text-gray-400">{company.orgs.length}개 조직</span>
      </div>
      {open && topOrgs.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2">
          {topOrgs.map((org) => {
            const subs = company.orgs.filter((o) => o.parentId === org.id);
            return <OrgUnitNode key={org.id} unit={org} subUnits={subs} />;
          })}
        </div>
      )}
      {open && topOrgs.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <p className="text-xs text-gray-400">등록된 조직이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default function OrgTree({ companies }: { companies: Company[] }) {
  return (
    <div>
      {companies.map((c) => (
        <CompanyNode key={c.id} company={c} />
      ))}
    </div>
  );
}
