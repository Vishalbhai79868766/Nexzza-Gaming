import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "forgot password" };
export default function Page() {
  return (
    <Suspense>
      <AuthForm mode="forgot-password" />
    </Suspense>
  );
}
