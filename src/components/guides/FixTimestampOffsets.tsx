export default function FixTimestampOffsets() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Fixing Off-By-Hours Timestamp Bugs</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          A timestamp that looks correct in logs but wrong in the app usually points to timezone or unit
          mistakes. Use this checklist to spot the problem fast and explain the fix to your teammates.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Confirm the Units</h2>
        <ul className="space-y-2">
          <li>
            Count the digits. Ten digits means seconds, thirteen digits means milliseconds. Mixing
            them adds or removes hours when you convert.
          </li>
          <li>
            In JavaScript, <code>Date.now()</code> returns milliseconds. In many APIs, timestamps come in
            seconds. Divide or multiply by 1000 before comparing numbers.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Check the Timezone Path</h2>
        <p>
          The backend should store UTC. The frontend turns UTC into local time for the user. If either
          side applies an extra offset, you will see a two, six, or twelve hour shift.
        </p>
        <ul className="space-y-2">
          <li>Look for <code>new Date(timestamp * 1000)</code> in the browser. This is correct.</li>
          <li>
            Look for <code>moment.utc(...)</code> or <code>toUTCString()</code> calls on the server. These keep
            the value in UTC.
          </li>
          <li>
            If you see manual math like <code>timestamp + 8 * 3600</code>, remove it. Let the date library handle
            offsets.
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Compare a Known Date</h2>
        <p>
          Pick a fixed, easy-to-spot moment such as <strong>2024-01-01 00:00:00 UTC</strong>. Convert it in
          each layer (database, API, frontend). Write the results in a quick table. The first mismatch
          shows where the bug lives.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Lock Your Formatting</h2>
        <p>
          Always send ISO 8601 strings or raw Unix timestamps. Avoid vague formats like
          <code>2024/01/01 08:00</code>. These depend on locale settings and cause silent timezone shifts.
        </p>
      </section>

      <section className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg space-y-3">
        <h2 className="text-2xl font-semibold">Quick Fix Recap</h2>
        <ul className="space-y-2">
          <li>✅ Keep storage in UTC and convert only when displaying to users.</li>
          <li>✅ Double-check the unit (seconds vs. milliseconds) before adding math.</li>
          <li>✅ Trace one sample timestamp through the stack to locate mistakes.</li>
          <li>✅ Document the expected format in API responses and client helpers.</li>
        </ul>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Follow this routine each time the time looks wrong. Your future self will thank you.
        </p>
      </section>
    </article>
  );
}
