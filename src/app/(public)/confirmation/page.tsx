import { Suspense } from "react";

import { getWhatsAppContact } from "@/lib/contact/get-whatsapp-contact";

import { ConfirmationContent } from "./ConfirmationContent";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage() {
  const whatsappContact = await getWhatsAppContact();

  return (
    <Suspense
      fallback={
        <main className="flex min-h-full items-center justify-center bg-shimai-black font-sans text-sm text-shimai-ivory/50">
          Cargando confirmación…
        </main>
      }
    >
      <ConfirmationContent whatsappPhone={whatsappContact.phone} />
    </Suspense>
  );
}
