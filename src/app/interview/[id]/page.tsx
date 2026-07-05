import InterviewRoom from "@/components/InterviewRoom";

interface PageProps {
  params: { id: string };
}

export default function InterviewPage({ params }: PageProps) {
  return <InterviewRoom sessionId={params.id} />;
}
