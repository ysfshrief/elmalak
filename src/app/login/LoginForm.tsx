"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { loginAction, type LoginState } from "@/actions/auth";
import { Input, Label, FieldError } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" loading={pending}>
      {!pending && <LogIn className="size-4.5" />}
      تسجيل الدخول
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <div>
        <Label htmlFor="username" required>
          اسم المستخدم
        </Label>
        <Input id="username" name="username" autoComplete="username" autoFocus placeholder="مثال: ymousa" />
      </div>

      <div>
        <Label htmlFor="password" required>
          كلمة المرور
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pl-11"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute left-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-faint hover:bg-bg-alt hover:text-ink"
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="rounded-[var(--radius-sm)] bg-error-soft px-3.5 py-2.5">
          <FieldError>{state.error}</FieldError>
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
