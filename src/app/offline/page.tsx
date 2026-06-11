import { Card } from "@/components/ui";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-5">
      <Card className="text-center">
        <h1 className="text-xl font-semibold">Je bent offline</h1>
        <p className="mt-2 text-sm text-muted">
          Zodra er weer verbinding is, kun je TaskHive verder gebruiken.
        </p>
      </Card>
    </main>
  );
}
