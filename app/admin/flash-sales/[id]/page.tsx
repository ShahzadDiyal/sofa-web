import { notFound } from "next/navigation";
import { listFlashSales } from "@/lib/db";
import FlashSaleForm from "../_form";

export default async function EditFlashSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sales = await listFlashSales();
  const sale = sales.find((s) => s.id === id);
  if (!sale) notFound();
  return <FlashSaleForm sale={sale} />;
}
