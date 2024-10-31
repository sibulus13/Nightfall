import React from "react";
import Image from "next/image";
import Link from "next/link";

const Navbar: React.FC = () => {
  return (
    <nav className="flex justify-between gap-6 p-2 font-semibold">
      <Link href="/">
        <div className="flex items-center">
          <Image
            src={"/favicon.png"}
            alt="favicon"
            width={50}
            height={50}
            className="pb-2"
          />
          <p className="">Nightfall</p>
        </div>
      </Link>
      <ul className="flex items-center justify-evenly gap-6">
        <li>
          <Link href="/App">App</Link>
        </li>
        <li>
          <Link href="/Api-doc">API</Link>
        </li>
        <li>
          <Link href="/About">About</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
