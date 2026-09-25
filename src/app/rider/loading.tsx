export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <div className="h-6 w-40 rounded-md bg-gray-100" />
      <div className="mt-4 grid gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4">
            <div className="h-4 w-1/2 rounded-md bg-gray-100" />
            <div className="mt-2 h-20 w-full rounded-lg bg-gray-50" />
          </div>
        ))}
      </div>
    </div>
  );
}

