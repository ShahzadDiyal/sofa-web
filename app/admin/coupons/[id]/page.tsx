import { notFound } from "next/navigation";
import { listCoupons } from "@/lib/db";
import CouponForm from "../_form";

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const coupons = await listCoupons();
  const coupon = coupons.find((c) => c.id === id);
  if (!coupon) notFound();
  return <CouponForm coupon={coupon} />;
}
