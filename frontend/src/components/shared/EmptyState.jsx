/*
  What a list shows before anything has been added: a heading, a sentence
  saying why it is worth adding something, and usually a button.

    <EmptyState title="No debts recorded." action={addButton}>
      Knowing the rate and the EMI turns a vague worry into a date.
    </EmptyState>
*/
export default function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-[22px] border border-dashed border-line bg-surface/50 p-10 text-center">
      <p className="font-display text-[22px] leading-snug">{title}</p>

      <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-ink2">{children}</p>

      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}
