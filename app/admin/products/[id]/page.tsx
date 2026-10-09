"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { EmptyState, ErrorBox, Skeleton, api } from "../../_ui";
import SofaForm from "../_form";

export default function EditSofaPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ product: Product }>(`/api/products/${id}`)
      .then(({ product }) => setProduct(product))
      .catch((e) => setError(e.message || "Could not load sofa."));
  }, [id]);

  if (error)
    return (
      <>
        <Link href="/admin/products" className="underline text-[14px] font-medium">
          ← Sofas
        </Link>
        <ErrorBox message={error} />
      </>
    );

  if (!product)
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-[40px] w-[280px]" />
        <Skeleton className="h-[400px]" />
      </div>
    );

  return <SofaForm key={product.id} product={product} />;
}
