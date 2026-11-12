export const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-base sm:text-lg font-bold text-heading mt-3.5 mb-2 pb-1.5 border-b border-border flex items-center gap-1.5 tracking-tight">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-sm sm:text-base font-bold text-heading mt-3 mb-1.5 flex items-center gap-1.5 tracking-tight">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-xs sm:text-sm font-semibold text-[#5B6CFF] mt-2.5 mb-1 tracking-wide">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed text-foreground my-1.5 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="my-2 space-y-1.5 pl-5 list-disc marker:text-[#5B6CFF] text-[13.5px] sm:text-[14.5px]">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2 space-y-1.5 pl-5 list-decimal marker:text-[#5B6CFF] marker:font-semibold text-[13.5px] sm:text-[14.5px]">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="leading-relaxed text-foreground pl-0.5">
      {children}
    </li>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-accent-strong bg-[#5B6CFF]/10 px-1 py-0.5 rounded">
      {children}
    </strong>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="my-2.5 pl-3.5 py-1.5 border-l-3 border-[#5B6CFF] bg-surface/80 rounded-r-xl text-xs sm:text-[13.5px] text-muted italic">
      {children}
    </blockquote>
  ),
  table: ({ children }: any) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-border shadow-xs">
      <table className="min-w-full divide-y divide-border text-xs sm:text-[13px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-surface text-heading font-semibold">{children}</thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="divide-y divide-border/60 bg-card">{children}</tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-background transition-colors">{children}</tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3.5 py-2.5 text-left font-semibold text-heading">{children}</th>
  ),
  td: ({ children }: any) => (
    <td className="px-3.5 py-2.5 text-foreground leading-normal">{children}</td>
  ),
  code: ({ className, children, ...props }: any) => {
    // react-markdown v9+ has no `inline` prop: block code has a language class or a newline
    const isBlock = /language-/.test(className || "") || String(children).includes("\n");
    if (!isBlock) {
      return (
        <code className="bg-surface text-[#5B6CFF] font-mono text-[12px] px-1.5 py-0.5 rounded-md border border-border/80 font-medium" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="font-mono text-xs text-[#FAFAF9] leading-relaxed block" {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }: any) => (
    <pre className="my-2.5 p-3.5 rounded-xl bg-[#202024] text-[#FAFAF9] font-mono text-xs overflow-x-auto border border-[#2B2B2E] shadow-xs leading-relaxed">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-3.5 border-t border-border" />,
};
