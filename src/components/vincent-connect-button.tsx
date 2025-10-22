"use client";

export default function VincentConnectButton() {
  const appId = process.env.NEXT_PUBLIC_VINCENT_APP_ID;
  const href = appId
    ? `https://dashboard.heyvincent.ai/user/appId/${appId}/connect`
    : undefined;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`px-3 py-2 rounded-md border text-sm hover:bg-accent ${
        href ? "" : "pointer-events-none opacity-50"
      }`}
      title={href ? "Open Vincent connect" : "Set NEXT_PUBLIC_VINCENT_APP_ID"}
    >
      {href ? "Create Vincent Session" : "Configure Vincent App ID"}
    </a>
  );
}
