export default function ExcelSerialToUnix() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Excel Serial Date to Unix Timestamp</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Turn Excel serial dates into Unix timestamps with one helper column. No macros, no add-ins,
          just simple math you can audit.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Seconds Workflow</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Put the Excel serial date in <code>A2</code>. Example: <code>45123.5</code>.</li>
          <li>
            In <code>B2</code> add <code>=INT((A2 - DATE(1970,1,1)) * 86400)</code> and press Enter.
          </li>
          <li>Fill the formula down. Copy → Paste Values if you need static numbers.</li>
        </ol>
        <p>
          Excel counts days from 1900 (or 1904 on macOS). We subtract the Unix start date and multiply
          by seconds in a day so both timelines match.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Milliseconds Workflow</h2>
        <p>
          APIs often ask for milliseconds. Extend the same formula:
          <code>=ROUND((A2 - DATE(1970,1,1)) * 86400000, 0)</code>. Use <code>ROUND</code> instead of
          <code>INT</code> so half-days become <code>43200000</code> cleanly.
        </p>
        <p>
          When you send the data to JSON or CSV, format the column as Number with zero decimals to avoid
          scientific notation.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Check the Date System</h2>
        <ul className="space-y-2">
          <li>
            Windows Excel uses the 1900 system. Numbers like <code>45123</code> map to 2023-08-02.
          </li>
          <li>
            macOS sheets may be on the 1904 system. Confirm via <strong>File → Options → Advanced → When
            calculating this workbook</strong>.
          </li>
          <li>
            If you switch systems, add or subtract <code>1462</code> days before running the formula so the
            timestamps stay accurate.
          </li>
        </ul>
      </section>

      <section className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg space-y-4">
        <h2 className="text-2xl font-semibold">Quick Reference</h2>
        <table className="table-auto w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2">Goal</th>
              <th className="text-left p-2">Formula</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Serial date → Unix seconds</td>
              <td className="p-2"><code>=INT((A2 - DATE(1970,1,1)) * 86400)</code></td>
            </tr>
            <tr>
              <td className="p-2">Serial date → Unix milliseconds</td>
              <td className="p-2"><code>=ROUND((A2 - DATE(1970,1,1)) * 86400000, 0)</code></td>
            </tr>
            <tr>
              <td className="p-2">1904 workbook adjustment</td>
              <td className="p-2"><code>=A2 + 1462</code> (before conversion)</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Hint: Google Sheets uses the 1900 system, so the seconds workflow works without tweaks.
        </p>
      </section>
    </article>
  );
}
