export const nodes = [
  {
    id: "1",
    type: "music",
    selector: { tags: ["calm", "morning"] },
    duration: 120,
    edges: [
      { to: "2", weight: 0.7 },
      { to: "3", weight: 0.3 }
    ]
  },

  {
    id: "2",
    type: "joke",
    selector: { tags: ["funny"] },
    duration: 30,
    edges: [
      { to: "4", weight: 1 }
    ]
  },

  {
    id: "3",
    type: "music",
    selector: { tags: ["energy"] },
    duration: 180
  },

  {
    id: "4",
    type: "news",
    selector: { tags: ["news"] },
    duration: 60
  }
];