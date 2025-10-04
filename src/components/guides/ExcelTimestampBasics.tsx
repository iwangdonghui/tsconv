export default function ExcelTimestampBasics() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Excel Timestamp Basics</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Spreadsheets like Excel or Google Sheets do not read Unix timestamps by default. This short
          guide shows how to turn raw epoch numbers into readable dates without fancy tricks.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Convert Seconds to Dates</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Place the Unix timestamp (seconds) in a cell, for example <code>A2</code>.</li>
          <li>In another cell type <code>=A2/86400+DATE(1970,1,1)</code>.</li>
          <li>Press Enter, then format the cell as Date or Date&nbsp;Time.</li>
        </ol>
        <p>
          Excel counts days starting from January 0, 1900. We divide by 86,400 (seconds per day) and add
          the Unix start date so both clocks line up.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Handle Milliseconds</h2>
        <p>
          Some APIs send 13-digit timestamps. Drop the extra digits before the formula:
          <code>=INT(A2/1000)</code>. Use the result in the same conversion formula. This keeps the
          math stable and avoids floating point surprises.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Stay in UTC or Local Time</h2>
        <ul className="space-y-2">
          <li>Add <code>+TIME(0,0,0)</code> if you only need the date and want to lock the time part.</li>
          <li>
            To show a local timezone, change the cell format to a custom pattern (for example
            <code>yyyy-mm-dd hh:mm:ss</code>) and let Excel apply your system offset.
          </li>
          <li>
            When sharing the sheet, add a note about the timezone so classmates and teammates are not
            confused.
          </li>
        </ul>
      </section>

      <section className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg space-y-4">
        <h2 className="text-2xl font-semibold">Quick Reference</h2>
        <table className="table-auto w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2">Scenario</th>
              <th className="text-left p-2">Formula</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Seconds → Date</td>
              <td className="p-2"><code>=A2/86400+DATE(1970,1,1)</code></td>
            </tr>
            <tr>
              <td className="p-2">Milliseconds → Seconds</td>
              <td className="p-2"><code>=INT(A2/1000)</code></td>
            </tr>
            <tr>
              <td className="p-2">Custom format</td>
              <td className="p-2"><code>yyyy-mm-dd hh:mm:ss</code></td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tip: Copy these formulas to Google Sheets without changes. Both apps share the same date math.
        </p>
      </section>
    </article>
  );
}
