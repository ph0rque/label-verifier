"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  labelFormSchema,
  LabelFormInput,
  LabelFormSubmission,
} from "@/types/form";

type FormProps = {
  onSubmit: (values: LabelFormSubmission) => Promise<void> | void;
  onReset?: () => void;
};

const DEFAULT_VALUES: LabelFormInput = {
  brandName: "",
  productClassType: "",
  alcoholContent: "",
  netContents: "",
  bottlerNameAddress: "",
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png"];

export function LabelVerificationForm({ onSubmit, onReset }: FormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LabelFormInput>({
    defaultValues: DEFAULT_VALUES,
    resolver: zodResolver(labelFormSchema),
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const imagePreviewUrl = useMemo(() => {
    if (!imageFile) return null;
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  const handleFormSubmit = async (values: LabelFormInput) => {
    if (!imageFile) {
      setImageError("Please upload a JPEG or PNG label image (max 10 MB).");
      return;
    }

    const submission: LabelFormSubmission = {
      ...values,
      imageFile,
    };

    await onSubmit(submission);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImageError("Please select an image file.");
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setImageFile(null);
      setImageError("Unsupported file type. Upload a JPEG or PNG image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImageFile(null);
      setImageError("File is too large. Maximum size is 10 MB.");
      return;
    }

    setImageError(null);
    setImageFile(file);
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="w-full max-w-2xl space-y-6"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Brand Name</span>
          <input
            type="text"
            {...register("brandName")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-invalid={!!errors.brandName}
          />
          {errors.brandName && (
            <span className="text-sm text-red-600">{errors.brandName.message}</span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Product Class / Type</span>
          <input
            type="text"
            {...register("productClassType")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-invalid={!!errors.productClassType}
          />
          {errors.productClassType && (
            <span className="text-sm text-red-600">
              {errors.productClassType.message}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Alcohol Content (ABV)</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g., 45%"
            {...register("alcoholContent")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-invalid={!!errors.alcoholContent}
          />
          {errors.alcoholContent && (
            <span className="text-sm text-red-600">
              {errors.alcoholContent.message}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Net Contents</span>
          <input
            type="text"
            placeholder="e.g., 750 mL"
            {...register("netContents")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-invalid={!!errors.netContents}
          />
          {errors.netContents && (
            <span className="text-sm text-red-600">
              {errors.netContents.message}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Bottler Name & Address (optional)</span>
          <input
            type="text"
            {...register("bottlerNameAddress")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          {errors.bottlerNameAddress && (
            <span className="text-sm text-red-600">
              {errors.bottlerNameAddress.message}
            </span>
          )}
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="label-image">
          Label Image
        </label>
        <input
          id="label-image"
          name="label-image"
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleFileChange}
          className="text-sm"
          aria-describedby="label-image-help label-image-error"
          required
        />
        <span id="label-image-help" className="text-xs text-zinc-500">
          Upload a clear JPEG or PNG image up to 10 MB.
        </span>
        {imageError && (
          <span id="label-image-error" className="text-sm text-red-600" role="alert">
            {imageError}
          </span>
        )}
        {imagePreviewUrl && !imageError && (
          <figure className="mt-2 flex flex-col gap-1">
            <div className="relative h-48 w-full overflow-hidden rounded-md border border-zinc-200">
              <Image
                src={imagePreviewUrl}
                alt="Label preview"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <figcaption className="text-xs text-zinc-500">
              Preview of uploaded label image
            </figcaption>
          </figure>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Verifying..." : "Verify Label"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset(DEFAULT_VALUES);
            setImageFile(null);
            setImageError(null);
            onReset?.();
          }}
          className="text-sm text-zinc-600 hover:text-zinc-800"
        >
          Reset form
        </button>
      </div>
    </form>
  );
}
