import { projects } from "../../shared/schema";

async function seed() {
  console.log("Seeding mock projects...");
  projects.push({
    clientName: "Test Client",
    address: "123 Main St",
    roomCount: 3,
    difficulty: "Medium",
  });
  console.log("Seeding complete.");
}

seed();
