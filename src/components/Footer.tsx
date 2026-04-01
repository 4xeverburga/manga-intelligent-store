import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto">
      <Separator />
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Hablemos Manga</p>
        <p>
          Powered by{" "}
          <span className="font-medium text-primary">Gemini AI</span> +{" "}
          <span className="font-medium text-foreground">pgvector</span>
        </p>
      </div>
    </footer>
  );
}
