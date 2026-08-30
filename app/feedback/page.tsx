import { revalidatePath } from "next/cache";
import { addFeedback, getFeedbackPosts } from "@/src/lib/feedback";

export const dynamic = "force-dynamic";

async function submitFeedback(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (name && text) {
    addFeedback(name, text);
    revalidatePath("/feedback");
  }
}

export default function FeedbackPage() {
  const posts = getFeedbackPosts();

  return (
    <main className="page-container feedback-page">
      <section className="feedback-hero">
        <p className="eyebrow">Product feedback</p>
        <h1>Make billing better, together.</h1>
        <p className="page-subtitle">
          InvoicePilot is shaped by the teams who use it every day. Tell us what is working and what could be smoother.
        </p>
      </section>

      <div className="feedback-layout">
        <section className="content-card posts-card" aria-labelledby="feedback-posts-heading">
          <div className="content-card-header">
            <div>
              <h2 id="feedback-posts-heading">What people are saying</h2>
              <p>Ideas and notes from the InvoicePilot community.</p>
            </div>
            <span className="count-pill">{posts.length} posts</span>
          </div>
          <div className="posts-list">
            {posts.map((post) => (
              <article className="feedback-post" key={post.id}>
                <div className="post-meta">
                  <span className="avatar avatar-small" aria-hidden="true">{post.name.charAt(0)}</span>
                  <div><h3>{post.name}</h3><time dateTime={post.createdAt}>{post.createdAt}</time></div>
                </div>
                <p>{post.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-card form-card" aria-labelledby="share-feedback-heading">
          <div className="form-card-icon" aria-hidden="true">✦</div>
          <h2 id="share-feedback-heading">Share your feedback</h2>
          <p>Your perspective helps us prioritize the next thoughtful improvement.</p>
          <form action={submitFeedback}>
            <label htmlFor="name">Name</label>
            <input id="name" name="name" required placeholder="Your name" />
            <label htmlFor="text">Feedback</label>
            <textarea id="text" name="text" required rows={5} placeholder="What would you like to see?"></textarea>
            <button className="button button-primary" type="submit">Post feedback <span aria-hidden="true">→</span></button>
          </form>
        </section>
      </div>
    </main>
  );
}
