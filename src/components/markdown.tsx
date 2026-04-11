import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";

// Lightweight, styled markdown renderer without relying on @tailwindcss/typography
// Works in server components. Map common tags to Tailwind classes.
export function Markdown({ content }: { content: string }) {
  const components: Components = {
    h1: (props) => (
      <h1 className="text-2xl font-bold mt-6 mb-3 text-foreground" {...props} />
    ),
    h2: (props) => (
      <h2 className="text-xl font-semibold mt-6 mb-2 text-foreground" {...props} />
    ),
    h3: (props) => (
      <h3 className="text-lg font-semibold mt-5 mb-2 text-foreground" {...props} />
    ),
    h4: (props) => (
      <h4 className="text-base font-semibold mt-4 mb-1.5 text-foreground" {...props} />
    ),
    p: (props) => (
      <p className="leading-7 text-foreground/90 my-2.5" {...props} />
    ),
    ul: (props) => (
      <ul className="list-disc pl-6 my-2.5 space-y-1 marker:text-muted-foreground" {...props} />
    ),
    ol: (props) => (
      <ol className="list-decimal pl-6 my-2.5 space-y-1 marker:text-muted-foreground" {...props} />
    ),
    li: (props) => <li className="leading-7 text-foreground/90" {...props} />,
    a: (props) => (
      <a className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors" {...props} />
    ),
    strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    pre: (props) => (
      <pre className="block w-full p-3 rounded-lg bg-muted text-foreground text-sm overflow-x-auto my-4" {...props} />
    ),
    code: (props) => (
      <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[0.875em]" {...props} />
    ),
    blockquote: (props) => (
      <blockquote
        className="border-l-3 border-primary/30 pl-4 italic text-foreground/80 my-4"
        {...props}
      />
    ),
    hr: () => <hr className="my-6 border-border" />,
  };

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
