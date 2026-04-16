"use client";

import type { FormEvent } from "react";
import { Suspense } from "react";
import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { API_BASE, setToken } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      setError("Could not sign in with those credentials.");
      return;
    }
    const data = await response.json();
    setToken(data.access_token);
    router.push(searchParams.get("next") || "/");
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-paper lg:grid-cols-[1fr_500px]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80"
          alt="Recruiting workspace"
          width={1400}
          height={1200}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(24,28,31,0.36),rgba(24,28,31,0.06))]" />
        <div className="absolute bottom-8 left-8 max-w-xl rounded-lg border border-white/25 bg-white/18 p-6 text-white shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-normal">DYOS AI Hiring</p>
          <h1 className="mt-3 text-4xl font-black tracking-normal">Evidence first. Faster review.</h1>
          <p className="mt-3 text-sm leading-6 text-white/86">Score candidates by job-specific proof, keep drafts under review, and move cleanly from screening to communication.</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-[#cbdad6] bg-white/92 p-7">
          <p className="text-xs font-black uppercase tracking-normal text-moss">Internal recruiter access</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-ink">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-[#63736f]">Review candidates with structured multi-pass AI evaluation.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">
              Email
              <Input className="mt-1" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="block text-sm font-medium">
              Password
              <Input className="mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error && <p className="rounded-lg border border-[#f1b2a4] bg-[#fff0ed] px-4 py-3 text-sm text-[#9c3726]">{error}</p>}
            <Button className="w-full" type="submit">Continue</Button>
          </form>
        </Card>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-paper text-sm text-[#63736f]">Loading sign in...</main>}>
      <LoginForm />
    </Suspense>
  );
}
