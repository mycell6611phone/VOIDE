export default function GlobalStyles() {
  if (typeof document === "undefined") {
    return null;
  }
  return (
    <style>
      {`
        textarea,
        input[type="text"],
        input[type="search"],
        input[type="email"],
        input[type="url"],
        input[type="password"],
        input[type="number"],
        input[type="tel"],
        input[type="time"],
        input[type="datetime-local"],
        input[type="month"],
        input[type="week"],
        select,
        button {
          font-family: inherit;
        }

        textarea,
        input[type="text"],
        input[type="search"],
        input[type="email"],
        input[type="url"],
        input[type="password"],
        input[type="number"],
        input[type="tel"],
        input[type="time"],
        input[type="datetime-local"],
        input[type="month"],
        input[type="week"] {
          caret-color: #2563eb;
          spellcheck: true;
        }

        textarea:focus-visible,
        input[type="text"]:focus-visible,
        input[type="search"]:focus-visible,
        input[type="email"]:focus-visible,
        input[type="url"]:focus-visible,
        input[type="password"]:focus-visible,
        input[type="number"]:focus-visible,
        input[type="tel"]:focus-visible,
        input[type="time"]:focus-visible,
        input[type="datetime-local"]:focus-visible,
        input[type="month"]:focus-visible,
        input[type="week"]:focus-visible,
        select:focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12);
        }

        textarea::spelling-error,
        input[type="text"]::spelling-error,
        input[type="search"]::spelling-error,
        input[type="email"]::spelling-error,
        input[type="url"]::spelling-error,
        input[type="password"]::spelling-error,
        input[type="number"]::spelling-error,
        input[type="tel"]::spelling-error,
        input[type="time"]::spelling-error,
        input[type="datetime-local"]::spelling-error,
        input[type="month"]::spelling-error,
        input[type="week"]::spelling-error {
          text-decoration: underline 2px #2563eb;
          text-decoration-skip-ink: none;
        }
      `}
    </style>
  );
}
