const inputClass =
  "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-black dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export function NameFields({
  firstName,
  lastName,
  error,
  submitLabel,
}: {
  firstName: string;
  lastName: string;
  error?: string;
  submitLabel: string;
}) {
  return (
    <>
      {error && (
        <p
          role="alert"
          className="rounded bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}
      <label className="text-sm font-medium text-black dark:text-zinc-50">
        First name
        <input
          name="first_name"
          required
          maxLength={50}
          defaultValue={firstName}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium text-black dark:text-zinc-50">
        Last name
        <input
          name="last_name"
          required
          maxLength={50}
          defaultValue={lastName}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-black px-4 py-2 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
      >
        {submitLabel}
      </button>
    </>
  );
}
