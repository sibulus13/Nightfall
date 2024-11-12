"use client";
import { addApiRequest } from "~/lib/mongodb/apiRequest/action";
import { useRef } from "react";
type apiRequestForm = {
  email: string;
};

export default function ApiPage() {
  const emailRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const newApiRequest: apiRequestForm = { email };
    const res = await addApiRequest(newApiRequest);
    console.log(res);
    alert(`${res.message}`);
    if (emailRef.current) {
      emailRef.current.value = "";
    }
  }
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
      <form className="flex flex-col gap-4 p-10" onSubmit={onSubmit}>
        <input
          ref={emailRef}
          name="email"
          type="email"
          placeholder="Email"
          className="rounded-3xl border-2 border-black bg-transparent p-2"
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}
