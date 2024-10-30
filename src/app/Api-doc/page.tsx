export default function ApiPage() {
  return (
    <div className="flex h-[calc(78vh)] flex-col gap-2">
      <h1>
        Nightfall API{" "}
        <span className="text-sm text-gray-400"> Coming Soon</span>
      </h1>
      <p>
        Want to use the prediction algorithm in your own venture? Sign up for
        the API waitlist below!
      </p>
      <form className="flex flex-col p-10">
        <input
          type="email"
          placeholder="Email"
          className="rounded-3xl border-2 border-black bg-transparent p-2"
        />
        <button type="submit">Sign Up</button>
      </form>
      {/* TODO link feedback form */}
    </div>
  );
}
