import { EventManager } from "@/components/ui/event-manager"

const now = new Date()
const y = now.getFullYear()
const m = now.getMonth()

const sampleEvents = [
  {
    id: "1",
    title: "Community Survey – Efate South",
    description: "Baseline fish stock survey with local fishing communities at Efate South coast",
    startTime: new Date(y, m, 3, 8, 0),
    endTime: new Date(y, m, 3, 12, 0),
    color: "blue",
    category: "Survey",
    tags: ["Important", "Community"],
  },
  {
    id: "2",
    title: "Coral Reef Monitoring Dive",
    description: "Benthic survey at Hideaway Island reef – coral cover and fish counts",
    startTime: new Date(y, m, 5, 7, 30),
    endTime: new Date(y, m, 5, 11, 30),
    color: "green",
    category: "Monitoring",
    tags: ["Field", "Urgent"],
  },
  {
    id: "3",
    title: "Stakeholder Meeting – VFA",
    description: "Quarterly coordination meeting with Vanuatu Fisheries Authority directors",
    startTime: new Date(y, m, 8, 10, 0),
    endTime: new Date(y, m, 8, 12, 0),
    color: "purple",
    category: "Meeting",
    tags: ["Important", "Government"],
  },
  {
    id: "4",
    title: "Dataset Upload Deadline",
    description: "Q1 marine area boundary data must be uploaded to the geoportal",
    startTime: new Date(y, m, 10, 16, 0),
    endTime: new Date(y, m, 10, 17, 0),
    color: "orange",
    category: "Deadline",
    tags: ["Urgent"],
  },
  {
    id: "5",
    title: "Bio. Monitoring – Tanna",
    description: "Monthly biological monitoring transects at Tanna Island – pelagic species",
    startTime: new Date(y, m, 12, 6, 0),
    endTime: new Date(y, m, 12, 14, 0),
    color: "blue",
    category: "Monitoring",
    tags: ["Field", "Important"],
  },
  {
    id: "6",
    title: "New Marine Area Submission",
    description: "Review and approve new LMMA boundary submission from Malekula communities",
    startTime: new Date(y, m, 14, 9, 0),
    endTime: new Date(y, m, 14, 10, 30),
    color: "green",
    category: "Review",
    tags: ["Community", "Government"],
  },
  {
    id: "7",
    title: "Training – GIS Data Collection",
    description: "Field team training on using mobile GIS apps for boundary data collection",
    startTime: new Date(y, m, 17, 8, 0),
    endTime: new Date(y, m, 17, 17, 0),
    color: "purple",
    category: "Training",
    tags: ["Team", "Important"],
  },
  {
    id: "8",
    title: "Catch Report Due",
    description: "Monthly catch statistics report submission to national database",
    startTime: new Date(y, m, 20, 15, 0),
    endTime: new Date(y, m, 20, 16, 0),
    color: "red",
    category: "Deadline",
    tags: ["Urgent"],
  },
  {
    id: "9",
    title: "Community Survey – Santo",
    description: "Socioeconomic survey with fishing households in Espiritu Santo",
    startTime: new Date(y, m, 22, 8, 0),
    endTime: new Date(y, m, 22, 12, 0),
    color: "blue",
    category: "Survey",
    tags: ["Community", "Field"],
  },
  {
    id: "10",
    title: "Inter-agency Data Sharing Meeting",
    description: "Coordination with VMGD and SPC on shared geospatial datasets",
    startTime: new Date(y, m, 25, 13, 0),
    endTime: new Date(y, m, 25, 14, 30),
    color: "pink",
    category: "Meeting",
    tags: ["Government", "Important"],
  },
]

export default function SchedulePage() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="page-title">Schedule</h1>
        <p className="page-subtitle">Manage surveys, monitoring dives, meetings and field activities</p>
      </div>
      <EventManager
        events={sampleEvents}
        categories={["Survey", "Monitoring", "Meeting", "Training", "Review", "Deadline"]}
        availableTags={["Important", "Urgent", "Field", "Community", "Government", "Team"]}
        defaultView="month"
        onEventCreate={(event) => console.log("Created:", event)}
        onEventUpdate={(id, event) => console.log("Updated:", id, event)}
        onEventDelete={(id) => console.log("Deleted:", id)}
      />
    </div>
  )
}
