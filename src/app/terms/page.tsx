import fs from "node:fs";
import path from "node:path";
import { Markdown } from "@/components/markdown";

export const dynamic = 'force-static';

const termsMarkdownPath = path.join(process.cwd(), "src/content/terms.md");
const termsMarkdown = fs.readFileSync(termsMarkdownPath, "utf8");

export default function TermsPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="max-w-none">
        <Markdown content={termsMarkdown} />
      </div>
    </div>
  );
}
