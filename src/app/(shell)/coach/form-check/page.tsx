import type { Metadata } from "next";

import { FormCheckClient } from "./form-check-client";

export const metadata: Metadata = {
  title: "Form Check",
};

export default function FormCheckPage() {
  return <FormCheckClient />;
}
