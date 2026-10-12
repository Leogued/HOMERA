import { getDb } from "@/lib/server/db/client";
import { currentUser } from "@/lib/server/auth/current";
import { createReport } from "@/lib/server/services/admin";
import { parseInput, reportSchema } from "@/lib/server/validation";
import { clientIp, fail, fromService, readJson } from "@/lib/server/http";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const parsed = parseInput(reportSchema, { ...(await readJson(request)), propertyId: id });
  if (!parsed.ok) return fail(parsed.message, 400, { fields: parsed.fields });
  return fromService(createReport(getDb(), user, parsed.data, { ip: clientIp(request) }), 201);
}
