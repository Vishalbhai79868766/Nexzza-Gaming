import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "register" };
export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
