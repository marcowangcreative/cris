import { loadAvailability } from "@/lib/booking/load";

export async function GET() {
  const result = await loadAvailability();
  return Response.json(result);
}
