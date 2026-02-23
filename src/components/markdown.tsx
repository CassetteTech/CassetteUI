import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";

// Lightweight, styled markdown renderer without relying on @tailwindcss/typography
// Works in server components. Map common tags to Tailwind classes.
export function Markdown({ content }: { content: string }) {
  const components: Components = {
    h1: (props) => (
      <h1 className="text-3xl font-bold mt-6 mb-4" {...props} />
    ),
    h2: (props) => (
      <h2 className="text-2xl font-semibold mt-6 mb-3" {...props} />
    ),
    h3: (props) => (
      <h3 className="text-xl font-semibold mt-5 mb-2" {...props} />
    ),
    h4: (props) => (
      <h4 className="text-lg font-semibold mt-4 mb-2" {...props} />
    ),
    p: (props) => (
      <p className="leading-7 text-foreground/90 my-3" {...props} />
    ),
    ul: (props) => (
      <ul className="list-disc pl-6 my-3 space-y-1" {...props} />
    ),
    ol: (props) => (
      <ol className="list-decimal pl-6 my-3 space-y-1" {...props} />
    ),
    li: (props) => <li className="leading-7" {...props} />,
    a: (props) => (
      <a className="text-primary underline underline-offset-4" {...props} />
    ),
    strong: (props) => <strong className="font-semibold" {...props} />,
    em: (props) => <em className="italic" {...props} />,
    pre: (props) => (
      // Block code wrapper
      <pre className="block w-full p-3 rounded bg-muted text-foreground overflow-x-auto my-4" {...props} />
    ),
    code: (props) => (
      // Inline code
      <code className="px-1 py-0.5 rounded bg-muted text-foreground" {...props} />
    ),
    blockquote: (props) => (
      <blockquote
        className="border-l-4 border-muted pl-4 italic text-foreground/80 my-4"
        {...props}
      />
    ),
    hr: () => <hr className="my-6 border-border" />,
  };

  return <ReactMarkdown components={components}>{content}</ReactMarkdown>;
}
