import { LoginForm } from "@/components/admin/LoginForm";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function AdminLoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextPath =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/admin/orders";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-shimai-black px-4">
      <div className="mb-10 text-center">
        <p className="font-serif text-4xl tracking-wide text-shimai-ivory">
          SHIMAI
        </p>
        <p className="mt-2 font-sans text-xs uppercase tracking-[0.22em] text-shimai-gold">
          Acceso hermanas
        </p>
      </div>
      <LoginForm nextPath={nextPath} />
    </div>
  );
}
