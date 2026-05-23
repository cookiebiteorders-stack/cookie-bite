"use client";

import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { getChatbotConfig } from "@/lib/ai-chat/config";
import {
  codeBlockClass,
  inlineCodeClass,
  markdownProseClass,
} from "@/lib/ai-chat/markdown";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark.css";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const config = getChatbotConfig().markdown;

  const plugins = useMemo(() => {
    const remark = [remarkGfm];
    const rehype = config.syntaxHighlight ? [rehypeHighlight] : [];
    return { remark, rehype };
  }, [config.syntaxHighlight]);

  if (!config.enabled) {
    return (
      <div className={cn("whitespace-pre-wrap break-words", className)}>
        {content}
      </div>
    );
  }

  return (
    <div className={cn(markdownProseClass, className)}>
      <ReactMarkdown
        remarkPlugins={plugins.remark}
        rehypePlugins={plugins.rehype}
        components={{
          code({ className: codeClass, children, ...props }) {
            const isBlock = Boolean(codeClass);
            if (isBlock) {
              return (
                <code className={cn(codeBlockClass, codeClass)} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={inlineCodeClass} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <pre className="my-0 overflow-x-auto">{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
