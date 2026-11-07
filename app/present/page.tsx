import type { Metadata } from "next";
import PresenterRemote from "@/ui/PresenterRemote";

export const metadata: Metadata = { title: "Presenter remote" };

export default function PresentPage() {
  return <PresenterRemote />;
}
