export type FeedbackPost = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
};

const posts: FeedbackPost[] = [
  { id: "feedback-1", name: "Maya Chen", text: "The invoice list is wonderfully clear. A quick way to see what needs attention is exactly what our small team needed.", createdAt: "July 29, 2024" },
  { id: "feedback-2", name: "Jon Bell", text: "It would be great to add a reminder before an invoice is due. I want to keep follow-up thoughtful and timely.", createdAt: "July 24, 2024" },
  { id: "feedback-3", name: "Ari Santos", text: "The receipt link after collecting a payment makes reconciliation much easier for our finance team.", createdAt: "July 18, 2024" }
];

export function getFeedbackPosts() {
  return posts.map((post) => ({ ...post }));
}

export function addFeedback(name: string, text: string) {
  posts.unshift({
    id: `feedback-${Date.now()}`,
    name,
    text,
    createdAt: "Just now"
  });
}
