import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KIPSET — Functional Fitness Companion",
  description: "A focused workout library, adaptive timer, training log, and running companion.",
};

export default function Home() {
  return (
    <main className="kipset-site">
      <iframe
        title="KIPSET Functional Fitness Companion"
        src="/kipset.html"
        allowFullScreen
      />
    </main>
  );
}
