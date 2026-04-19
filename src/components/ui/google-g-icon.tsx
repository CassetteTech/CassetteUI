import * as React from "react";

export function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="#4285F4"
        d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.2c-.6 3.1-2.3 5.8-4.9 7.6v6.3h7.9c4.6-4.3 7.3-10.6 7.3-18.2z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 12-2.1 16-5.8l-7.9-6.3c-2.2 1.5-5 2.4-8.1 2.4-6.2 0-11.5-4.2-13.4-9.8H2.5v6.1C6.5 42.8 14.6 48 24 48z"
      />
      <path
        fill="#FBBC04"
        d="M10.6 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6v-6.1H2.5C.9 16.5 0 20.2 0 24s.9 7.5 2.5 10.7l8.1-6.1z"
      />
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C36 2.3 30.5 0 24 0 14.6 0 6.5 5.2 2.5 12.7l8.1 6.1C12.5 13.7 17.8 9.5 24 9.5z"
      />
    </svg>
  );
}
