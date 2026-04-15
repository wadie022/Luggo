import AgencyTopBar from "@/components/AgencyTopBar";

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AgencyTopBar />
      {children}
    </>
  );
}
