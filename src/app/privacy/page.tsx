import fs from "node:fs";
import path from "node:path";
import { Markdown } from "@/components/markdown";

export const dynamic = 'force-static';

const privacyMarkdownPath = path.join(process.cwd(), "src/content/privacy.md");
const privacyMarkdown = fs.readFileSync(privacyMarkdownPath, "utf8");

export default function PrivacyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="max-w-none">
        <Markdown content={privacyMarkdown} />
      </div>
    </div>
  );
}
