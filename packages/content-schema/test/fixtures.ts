const blockFixtures = [
  {
    id: "block_heading_1",
    props: { level: 1, text: "Kenali Anemia" },
    type: "heading",
    version: 1,
  },
  {
    id: "block_paragraph_1",
    props: { text: "Anemia dapat dicegah dengan pengetahuan dan kebiasaan yang tepat." },
    type: "paragraph",
    version: 1,
  },
  {
    id: "block_image_1",
    props: {
      altText: "Ilustrasi sel darah merah sehat",
      aspectRatio: { height: 3, width: 4 },
      caption: "Sel darah merah membawa oksigen.",
      decorative: false,
      mediaId: "media_blood_cells",
    },
    type: "image",
    version: 1,
  },
  {
    id: "block_video_1",
    props: {
      aspectRatio: { height: 9, width: 16 },
      caption: "Apa itu anemia?",
      mediaId: "media_anemia_video",
    },
    type: "video",
    version: 1,
  },
  {
    id: "block_callout_1",
    props: { text: "Minum TTD sesuai anjuran.", title: "Ingat", tone: "tip" },
    type: "callout",
    version: 1,
  },
  {
    id: "block_quote_1",
    props: { attribution: "Materi edukasi", text: "Kebiasaan kecil mendukung kesehatan." },
    type: "quote",
    version: 1,
  },
  {
    id: "block_link_1",
    props: {
      appearance: "button",
      href: "https://example.org/sumber-anemia",
      label: "Baca sumber",
    },
    type: "button-link",
    version: 1,
  },
  {
    id: "block_divider_1",
    props: { style: "solid" },
    type: "divider",
    version: 1,
  },
  {
    id: "block_myth_fact_1",
    props: { mythFactId: "myth_fact_iron_1" },
    type: "myth-fact",
    version: 1,
  },
  {
    id: "block_quiz_trigger_1",
    props: { quizId: "quiz_anemia_1" },
    type: "quiz-trigger",
    version: 1,
  },
] as const;

export const validPageDocumentFixture = {
  blocks: blockFixtures,
  layout: { background: "surface-default", preset: "portrait" },
  pageId: "page_anemia_1",
  schemaVersion: 1,
} as const;
