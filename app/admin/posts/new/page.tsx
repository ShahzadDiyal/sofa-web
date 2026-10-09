import PostForm from "../_form";

export default function NewPostPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">New article</h1>
        <p className="text-[14px] text-muted">Saved as a draft until you publish it.</p>
      </div>
      <PostForm />
    </div>
  );
}
