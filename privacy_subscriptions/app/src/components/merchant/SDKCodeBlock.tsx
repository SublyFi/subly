"use client";

import { useState } from "react";

interface SDKCodeBlockProps {
  title?: string;
  code: string;
  language?: string;
}

export function SDKCodeBlock({
  title,
  code,
  language = "typescript",
}: SDKCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          {title && (
            <span className="text-sm font-medium text-gray-300">{title}</span>
          )}
          <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span className="text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="bg-gray-900 overflow-x-auto">
        <pre className="p-4 text-sm text-gray-300 font-mono whitespace-pre">
          {code}
        </pre>
      </div>
    </div>
  );
}

/**
 * Simple copyable text component
 */
interface CopyableTextProps {
  label: string;
  value: string;
  truncate?: boolean;
}

export function CopyableText({ label, value, truncate = true }: CopyableTextProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const displayValue = truncate && value.length > 20
    ? `${value.slice(0, 8)}...${value.slice(-8)}`
    : value;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
      <div>
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        <p className="text-sm font-mono text-white">{displayValue}</p>
      </div>
      <button
        onClick={handleCopy}
        className="p-2 text-gray-400 hover:text-white transition-colors"
      >
        {copied ? (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
