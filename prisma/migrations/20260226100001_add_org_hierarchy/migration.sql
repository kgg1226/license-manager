-- 변경: OrgCompany, OrgUnit 모델 추가 및 Employee에 조직 계층 필드(title, companyId, orgId, subOrgId) 추가

-- OrgCompany 테이블 생성
CREATE TABLE "OrgCompany" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "OrgCompany_name_key" ON "OrgCompany"("name");

-- OrgUnit 테이블 생성 (self-relation으로 계층 표현)
CREATE TABLE "OrgUnit" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgUnit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "OrgCompany" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OrgUnit_name_companyId_parentId_key" ON "OrgUnit"("name", "companyId", "parentId");

-- Employee에 조직 계층 필드 추가
ALTER TABLE "Employee" ADD COLUMN "title" TEXT;
ALTER TABLE "Employee" ADD COLUMN "companyId" INTEGER REFERENCES "OrgCompany"("id");
ALTER TABLE "Employee" ADD COLUMN "orgId" INTEGER REFERENCES "OrgUnit"("id");
ALTER TABLE "Employee" ADD COLUMN "subOrgId" INTEGER REFERENCES "OrgUnit"("id");
