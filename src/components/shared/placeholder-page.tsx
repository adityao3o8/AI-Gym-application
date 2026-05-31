import Link from "next/link";
import { ArrowLeft, Construction } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PageMeta } from "@/types";

type PlaceholderPageProps = PageMeta & {
  backHref?: string;
  backLabel?: string;
};

export function PlaceholderPage({
  title,
  description,
  badge,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader title={title} description={description} badge={badge} />

      <Card className="border-border/60 bg-card/80 glow-primary">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Construction className="size-5" />
            </div>
            <div>
              <CardTitle>Coming in a future phase</CardTitle>
              <CardDescription>
                This route is wired up. Feature implementation is next.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button render={<Link href={backHref} />}>
            <ArrowLeft data-icon="inline-start" />
            {backLabel}
          </Button>
          <Button variant="outline" render={<Link href="/" />}>
            Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
