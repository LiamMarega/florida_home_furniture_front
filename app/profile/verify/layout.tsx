// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = 'force-dynamic';

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

