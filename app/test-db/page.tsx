import { supabase } from "@/lib/supabase";

export default async function TestDbPage() {
  const { data, error } = await supabase
    .from("submissions")
    .select("*");

  return (
    <main className="p-10 text-white bg-black min-h-screen">
      <h1 className="text-3xl font-bold mb-6">
        Supabase Test
      </h1>

      <pre className="rounded-xl bg-white/10 p-4 overflow-auto">
        {JSON.stringify(
          {
            data,
            error,
          },
          null,
          2
        )}
      </pre>
    </main>
  );
}