import Link from "next/link";
import { connection } from "next/server";
import { supabase } from "@/lib/supabase";

export default async function BooksPage() {
  await connection();

  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, author, published_year")
    .order("published_year");

  if (error) {
    throw new Error(`Failed to load books: ${error.message}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 font-sans">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Books
      </h1>
      <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
        {books.map((book) => (
          <li key={book.id} className="py-4">
            <p className="font-medium text-black dark:text-zinc-50">
              {book.title}
            </p>
            <p className="text-sm text-zinc-500">
              {book.author} · {book.published_year}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
