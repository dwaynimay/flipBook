import { preparePageDocumentForReader } from "@booklet/content-schema";
import type { BlockResourceResolver, MythFactResource } from "@booklet/block-renderer";
import type { QuizDefinition } from "@booklet/quiz-engine";

const pageSources = [
  {
    blocks: [
      {
        id: "block_cover_kicker",
        props: { text: "Seri Ruang Sehat · Edisi 01" },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_cover_title",
        props: { level: 1, text: "Kenali Anemia" },
        type: "heading",
        version: 1,
      },
      {
        id: "block_cover_intro",
        props: {
          text: "Panduan visual singkat untuk memahami tubuh, kebiasaan sehat, dan Tablet Tambah Darah.",
        },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_cover_note",
        props: {
          text: "Geser atau gunakan tombol panah untuk mulai membaca.",
          title: "6 halaman · ± 5 menit",
          tone: "info",
        },
        type: "callout",
        version: 1,
      },
    ],
    layout: { background: "accent-subtle", preset: "portrait" },
    pageId: "page_cover",
    schemaVersion: 1,
  },
  {
    blocks: [
      {
        id: "block_intro_label",
        props: { text: "01 · Mulai dari dasar" },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_intro_title",
        props: { level: 1, text: "Apa itu anemia?" },
        type: "heading",
        version: 1,
      },
      {
        id: "block_intro_body",
        props: {
          text: "Anemia adalah kondisi ketika jumlah sel darah merah atau konsentrasi hemoglobin berada di bawah kebutuhan tubuh. Dampaknya bisa terasa berbeda pada setiap orang.",
        },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_intro_callout",
        props: {
          text: "Mudah lelah, pusing, atau sulit berkonsentrasi dapat memiliki banyak penyebab. Pemeriksaan tenaga kesehatan membantu memastikan penyebabnya.",
          title: "Kenali, jangan mendiagnosis sendiri",
          tone: "warning",
        },
        type: "callout",
        version: 1,
      },
      {
        id: "block_intro_quote",
        props: {
          attribution: "Prinsip booklet ini",
          text: "Informasi yang baik membantu kita mengambil langkah yang lebih tepat.",
        },
        type: "quote",
        version: 1,
      },
    ],
    layout: { background: "surface-default", preset: "portrait" },
    pageId: "page_basics",
    schemaVersion: 1,
  },
  {
    blocks: [
      {
        id: "block_video_label",
        props: { text: "02 · Tonton singkat" },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_video_title",
        props: { level: 1, text: "Sehat tanpa anemia" },
        type: "heading",
        version: 1,
      },
      {
        id: "block_video_intro",
        props: {
          text: "Video berikut berasal dari kanal edukasi publik dan baru dimuat setelah kamu menekan tombol putar.",
        },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_video_player",
        props: {
          aspectRatio: { height: 9, width: 16 },
          caption: "Remaja Putri Sehat Anti Anemia · YouTube",
          mediaId: "media_anemia_video",
        },
        type: "video",
        version: 1,
      },
      {
        id: "block_video_tip",
        props: { text: "Kamu tetap dapat melanjutkan booklet tanpa memutar video.", tone: "tip" },
        type: "callout",
        version: 1,
      },
    ],
    layout: { background: "surface-subtle", preset: "portrait" },
    pageId: "page_video",
    schemaVersion: 1,
  },
  {
    blocks: [
      { id: "block_myth_label", props: { text: "03 · Uji asumsi" }, type: "paragraph", version: 1 },
      {
        id: "block_myth_title",
        props: { level: 1, text: "Mitos atau fakta?" },
        type: "heading",
        version: 1,
      },
      {
        id: "block_myth_intro",
        props: {
          text: "Informasi kesehatan sering terdengar sederhana, padahal konteksnya penting. Buka kartu di bawah untuk melihat penjelasannya.",
        },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_myth_card",
        props: { mythFactId: "myth_fact_tired_equals_anemia" },
        type: "myth-fact",
        version: 1,
      },
    ],
    layout: { background: "accent-subtle", preset: "portrait" },
    pageId: "page_myth",
    schemaVersion: 1,
  },
  {
    blocks: [
      {
        id: "block_ttd_label",
        props: { text: "04 · Bangun kebiasaan" },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_ttd_title",
        props: { level: 1, text: "Ingat TTD, tanpa menghakimi" },
        type: "heading",
        version: 1,
      },
      {
        id: "block_ttd_body",
        props: {
          text: "Reminder membantu mengubah niat menjadi rutinitas. Catat dengan jujur—sudah, belum, atau dilewati—agar pola kebiasaan mudah dipahami.",
        },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_ttd_callout",
        props: {
          text: "Ikuti dosis dan jadwal dari tenaga kesehatan atau program kesehatan yang kamu jalani.",
          title: "Catatan penting",
          tone: "tip",
        },
        type: "callout",
        version: 1,
      },
      { id: "block_ttd_divider", props: { style: "dashed" }, type: "divider", version: 1 },
      {
        id: "block_ttd_quote",
        props: {
          attribution: "Ruang Sehat",
          text: "Konsisten bukan berarti selalu sempurna; yang penting kembali melanjutkan.",
        },
        type: "quote",
        version: 1,
      },
    ],
    layout: { background: "surface-default", preset: "portrait" },
    pageId: "page_habit",
    schemaVersion: 1,
  },
  {
    blocks: [
      { id: "block_quiz_label", props: { text: "05 · Refleksi" }, type: "paragraph", version: 1 },
      {
        id: "block_quiz_title",
        props: { level: 1, text: "Sudah siap mengecek pemahaman?" },
        type: "heading",
        version: 1,
      },
      {
        id: "block_quiz_body",
        props: {
          text: "Kuis ini berjalan lokal sebagai demonstrasi pengalaman belajar. Jawabanmu tidak dikirim atau disimpan.",
        },
        type: "paragraph",
        version: 1,
      },
      {
        id: "block_quiz_trigger",
        props: { quizId: "quiz_anemia_preview" },
        type: "quiz-trigger",
        version: 1,
      },
      {
        id: "block_quiz_disclaimer",
        props: {
          text: "Materi ini bersifat edukatif dan bukan pengganti diagnosis atau konsultasi medis.",
          title: "Selesai",
          tone: "info",
        },
        type: "callout",
        version: 1,
      },
    ],
    layout: { background: "surface-subtle", preset: "portrait" },
    pageId: "page_quiz",
    schemaVersion: 1,
  },
] as const;

export const readerDocuments = pageSources.map(
  (source) => preparePageDocumentForReader(source).document,
);

const mythFact: MythFactResource = {
  explanation:
    "Keluhan lelah tidak spesifik untuk satu kondisi. Informasi gejala perlu dilihat bersama riwayat dan, bila diperlukan, pemeriksaan oleh tenaga kesehatan.",
  fact: "Lelah dapat memiliki banyak penyebab; anemia tidak dapat dipastikan hanya dari satu keluhan.",
  myth: "Kalau sering lelah, berarti pasti anemia.",
  sourceLabel: "Pelajari topik anemia di WHO",
  sourceUrl: "https://www.who.int/health-topics/anaemia",
};

export const resources: BlockResourceResolver = {
  image: () => undefined,
  mythFact: (id) => (id === "myth_fact_tired_equals_anemia" ? mythFact : undefined),
  video: (id) =>
    id === "media_anemia_video"
      ? {
          kind: "youtube",
          title: "Remaja Putri Sehat Anti Anemia",
          videoId: "FrE4kyCLqgQ",
        }
      : undefined,
};

export const anemiaQuiz = {
  description: "Tiga pertanyaan singkat dari materi yang baru dibaca.",
  id: "quiz_anemia_preview",
  questions: [
    {
      correctOptionId: "needs-context",
      explanation:
        "Keluhan saja tidak cukup untuk memastikan anemia; konteks dan pemeriksaan dapat diperlukan.",
      id: "question_symptom",
      options: [
        { id: "always-anemia", label: "Pasti anemia" },
        { id: "needs-context", label: "Perlu dilihat bersama informasi lain" },
        { id: "never-important", label: "Tidak pernah perlu diperhatikan" },
      ],
      prompt: "Jika seseorang sering lelah, kesimpulan yang paling tepat adalah…",
      type: "multiple-choice",
    },
    {
      correctOptionId: "follow-guidance",
      explanation:
        "Penggunaan TTD mengikuti dosis dan jadwal dari tenaga kesehatan atau program kesehatan terkait.",
      id: "question_ttd",
      options: [
        { id: "follow-guidance", label: "Ikuti panduan tenaga/program kesehatan" },
        { id: "double-dose", label: "Gandakan bila lupa" },
        { id: "copy-friend", label: "Salin jadwal teman" },
      ],
      prompt: "Bagaimana menentukan jadwal Tablet Tambah Darah?",
      type: "multiple-choice",
    },
    {
      correctOptionId: "educational",
      explanation:
        "Booklet membantu belajar, tetapi bukan alat diagnosis atau pengganti konsultasi medis.",
      id: "question_scope",
      options: [
        { id: "diagnosis", label: "Alat diagnosis mandiri" },
        { id: "educational", label: "Materi edukasi" },
        { id: "prescription", label: "Resep personal" },
      ],
      prompt: "Apa peran booklet ini?",
      type: "multiple-choice",
    },
  ],
  title: "Cek pemahamanmu",
} as const satisfies QuizDefinition;
