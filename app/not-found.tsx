import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[70vh] grid place-items-center px-6 py-24">
      <div className="text-center max-w-md">
        <p className="label-caps mb-4">404</p>
        <h1 className="text-5xl mb-4">This seat is taken.</h1>
        <p className="text-body mb-8">
          The page you&apos;re looking for doesn&apos;t exist — but plenty of comfortable ones do.
        </p>
        <Link href="/sofas" className="btn btn-primary">
          Shop all sofas
        </Link>
      </div>
    </main>
  );
}
