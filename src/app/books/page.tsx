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
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-24 pt-10">
      <Link href="/" className="text-sm font-bold text-muted hover:text-ink">
        ← Home
      </Link>
      <h1 className="mt-4 text-3xl font-black tracking-tight">
        Books
      </h1>
      <ul className="mt-6 space-y-4">
        {books.map((book) => (
          <li key={book.id} className="clay-sm reveal p-5">
            <p className="font-black">
              {book.title}
            </p>
            <p className="text-sm text-muted">
              {book.author} · {book.published_year}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
