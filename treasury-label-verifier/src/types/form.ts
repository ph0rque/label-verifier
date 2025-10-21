import { z } from "zod";

export const REQUIRED_FIELDS = [
  "brandName",
  "productClassType",
  "alcoholContent",
  "netContents",
] as const;

export const ABV_REGEX = /^\d+(\.\d+)?%?$/;
export const NET_CONTENTS_REGEX = /^\d+\s?(mL|L|FL\.?\s?OZ|OZ)$/i;

export const labelFormSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(1, "Brand name is required"),
  productClassType: z
    .string()
    .trim()
    .min(1, "Product class/type is required"),
  alcoholContent: z
    .string()
    .trim()
    .refine((val) => ABV_REGEX.test(val), {
      message: "Enter ABV as a percentage (e.g., 45%)",
    }),
  netContents: z
    .string()
    .trim()
    .refine((val) => NET_CONTENTS_REGEX.test(val), {
      message: "Enter net contents with unit (e.g., 750 mL, 12 fl oz)",
    }),
  bottlerNameAddress: z
    .string()
    .trim()
    .optional()
    .or(z.literal("")),
  governmentWarningAcknowledged: z.boolean().optional(),
});

export type LabelFormInput = z.infer<typeof labelFormSchema>;

export interface LabelFormState extends LabelFormInput {
  bottlerNameAddress?: string;
  governmentWarningAcknowledged?: boolean;
  imageFile: File | null;
}

export interface LabelFormSubmission extends LabelFormInput {
  imageFile: File;
}

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export type FieldStatus = "matched" | "mismatch" | "not_found";

export type GovernmentWarningStatus = "present" | "missing";

export interface VerificationCheck {
  field: RequiredField | "governmentWarning";
  status: FieldStatus | GovernmentWarningStatus;
  formValue: string | null;
  detectedValue: string | null | boolean;
  notes?: string[];
}

export type OverallStatus = "match" | "mismatch" | "unreadable";

export interface VerificationResponse {
  overallStatus: OverallStatus;
  checks: VerificationCheck[];
  notes: string[];
}

export interface VerificationRequestBody {
  brandName: string;
  productClassType: string;
  alcoholContent: string;
  netContents: string;
  bottlerNameAddress?: string;
  governmentWarningAcknowledged?: boolean;
}
