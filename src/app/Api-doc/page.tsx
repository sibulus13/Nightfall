export default function ApiPage() {
  return (
    <div className="page gap-10">
      <div>
        <h1>Nightfalls API</h1>
        <h2 className="text-sm text-gray-400"> Coming Soon</h2>
        <p>
          Want to use the prediction algorithm in your own venture? Sign up for
          the API waitlist below!
        </p>
      </div>
      <form className="flex flex-col gap-4 p-10">
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
