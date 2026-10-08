const inputClass =
  "clay-inset field mt-2";

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
          className="clay-sm tint-blush px-4 py-3 text-sm font-bold"
        >
          {error}
        </p>
      )}
      <label className="text-sm font-bold">
        First name
        <input
          name="first_name"
          required
          maxLength={50}
          defaultValue={firstName}
          className={inputClass}
        />
      </label>
      <label className="text-sm font-bold">
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
        className="btn btn-primary mt-2"
      >
        {submitLabel}
      </button>
    </>
  );
}
