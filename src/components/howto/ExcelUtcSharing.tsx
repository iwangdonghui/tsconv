export default function ExcelUtcSharing() {
  return (
    <article className="prose prose-slate dark:prose-invert max-w-none">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Keep Excel Sheets in UTC</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Lock spreadsheet timestamps to UTC before exporting to APIs or sharing with teammates. These
          quick checks stop silent timezone drift.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Freeze the Source Column</h2>
        <ol className="list-decimal list-inside space-y-2">
          <li>Insert a helper column next to your Unix timestamps.</li>
          <li>
            Use <code>=TEXT((A2/86400)+DATE(1970,1,1),"yyyy-mm-dd hh:mm:ss")&amp;" UTC"</code> to turn the
            number into a fixed UTC string.
          </li>
          <li>Copy → Paste Values so the text no longer recalculates when the workbook opens.</li>
        </ol>
        <p>
          Excel applies your system timezone to date formatting. Converting to text keeps the UTC label
          intact when someone else opens the file.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Stamp the Offset (Optional)</h2>
        <p>
          Need to show both UTC and a local clock? Add
          <code>=TEXT(((A2/86400)+DATE(1970,1,1))+TIME(5,30,0),"yyyy-mm-dd hh:mm:ss")&amp;" IST"</code> to produce
          a labeled copy with a fixed offset. Replace <code>TIME(5,30,0)</code> with your target
          difference.
        </p>
        <p>
          Never overwrite the original Unix timestamp. Store conversions in a separate column so APIs can
          still read the raw number.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Share Without Surprises</h2>
        <ul className="space-y-2">
          <li>Add a header note like <code>"All timestamps are UTC"</code> or pin a comment.</li>
          <li>
            Export as CSV with UTF-8 encoding. Text strings survive intact and downstream tools do not
            guess the timezone.
          </li>
          <li>
            If you publish to Google Sheets, set <strong>File → Settings → Time zone</strong> to
            <strong>GMT</strong> before pasting the data.
          </li>
        </ul>
      </section>

      <section className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg space-y-4">
        <h2 className="text-2xl font-semibold">Quick Reference</h2>
        <table className="table-auto w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2">Scenario</th>
              <th className="text-left p-2">Formula or Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Unix seconds → UTC string</td>
              <td className="p-2"><code>=TEXT((A2/86400)+DATE(1970,1,1),"yyyy-mm-dd hh:mm:ss")&amp;" UTC"</code></td>
            </tr>
            <tr>
              <td className="p-2">Unix milliseconds → UTC string</td>
              <td className="p-2"><code>=TEXT((A2/1000/86400)+DATE(1970,1,1),"yyyy-mm-dd hh:mm:ss")&amp;" UTC"</code></td>
            </tr>
            <tr>
              <td className="p-2">Check workbook timezone</td>
              <td className="p-2">File → Options → Advanced → When calculating this workbook</td>
            </tr>
          </tbody>
        </table>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Reminder: keep a raw Unix column for imports. Use the formatted copy for humans.
        </p>
      </section>
    </article>
  );
}
