import { SoleraExperience } from "@/components/solera-experience";
import { MODEL_CATALOG } from "@/lib/models";

export default function Home() {
  return <SoleraExperience models={MODEL_CATALOG} />;
}
