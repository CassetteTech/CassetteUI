import fs from "node:fs";
import path from "node:path";
import { Markdown } from "@/components/markdown";

export const dynamic = 'force-static';

const termsMarkdownPath = path.join(process.cwd(), "src/content/terms.md");
const termsMarkdown = fs.readFileSync(termsMarkdownPath, "utf8");

export default function TermsPage() {
  return (
    <div className="min-h-screen surface-bottom relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 md:pt-24 pb-20">
        <header className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Legal &middot; Cassette Technologies
          </p>
          <h1 className="font-teko text-5xl sm:text-6xl font-bold uppercase text-foreground tracking-tight leading-[0.9]">
            Terms of Service
            <span
              aria-hidden
              className="ml-1 inline-block h-6 sm:h-8 w-2 bg-primary align-baseline"
            />
          </h1>
          <div className="editorial-rule-thick mt-6" />
        </header>

        <article className="bg-background border-2 border-foreground p-6 sm:p-10 shadow-[6px_6px_0_hsl(var(--foreground))] max-w-none">
          <Markdown content={termsMarkdown} />
        </article>
      </div>
    </div>
  );
}
