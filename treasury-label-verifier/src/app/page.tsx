"use client";

import { useState } from "react";
import { LabelVerificationForm } from "@/components/Form";
import { VerificationResults } from "@/components/Results";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import type { LabelFormSubmission, VerificationResponse } from "@/types/form";

export default function Home() {
  const [result, setResult] = useState<VerificationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: LabelFormSubmission) => {
    try {
      setIsLoading(true);
      setError(null);
      setResult(null);

      const formData = new FormData();
      formData.append("brandName", values.brandName);
      formData.append("productClassType", values.productClassType);
      formData.append("alcoholContent", values.alcoholContent);
      formData.append("netContents", values.netContents);
      if (values.bottlerNameAddress) {
        formData.append("bottlerNameAddress", values.bottlerNameAddress);
      }
      if (typeof values.governmentWarningAcknowledged !== "undefined") {
        formData.append(
          "governmentWarningAcknowledged",
          values.governmentWarningAcknowledged ? "true" : "false",
        );
      }
      formData.append("labelImage", values.imageFile);

      const response = await fetch("/api/verify", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error ?? "Verification failed. Please try again.";
        throw new Error(message);
      }

      const data = (await response.json()) as VerificationResponse;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-zinc-900">
          Alcohol Label Verification
        </h1>
        <p className="max-w-3xl text-sm text-zinc-600">
          Compare submitted application data with OCR-extracted label details to
          surface mismatches before manual review.
        </p>
      </header>

      <main className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-medium text-zinc-900">Form Input</h2>
          <LabelVerificationForm
            onSubmit={handleSubmit}
            onReset={() => {
              setResult(null);
              setError(null);
            }}
          />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-zinc-900">Results</h2>
            {isLoading && <LoadingIndicator />}
          </div>
          <div className="mt-4 space-y-4">
            {!isLoading && !result && !error && (
              <p className="text-sm text-zinc-500">
                Submit the form to view verification results.
              </p>
            )}

            <VerificationResults result={result} error={error} />
          </div>
        </section>
      </main>
    </div>
  );
}
