import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useAsyncData from '../src/hooks/useAsyncData';
import useRecordEditor from '../src/hooks/useRecordEditor';
import Notice from '../src/components/shared/Notice';
import PillGroup from '../src/components/shared/PillGroup';
import RecordActions from '../src/components/shared/RecordActions';

/*
  Tests for the shared hooks and components every page is built from.
  Run with: npm test
*/


/* A promise that the test resolves by hand, to control the order answers arrive in. */
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise: promise, resolve: resolve };
}


// ---------------------------------------------------------------
// useAsyncData
// ---------------------------------------------------------------

test('useAsyncData starts empty, then holds the loaded data', async () => {
  const load = async () => {
    return { ok: true, data: { goals: [1, 2] } };
  };

  const { result } = renderHook(() => useAsyncData(load));

  expect(result.current.data).toBe(null);

  await waitFor(() => {
    expect(result.current.data).toEqual({ goals: [1, 2] });
  });
  expect(result.current.error).toBe('');
});


test('useAsyncData reports a failed load as an error', async () => {
  const load = async () => {
    return { ok: false, error: 'Cannot reach the server.' };
  };

  const { result } = renderHook(() => useAsyncData(load));

  await waitFor(() => {
    expect(result.current.error).toBe('Cannot reach the server.');
  });
  expect(result.current.data).toBe(null);
});


test('useAsyncData ignores an older answer that arrives after a newer one', async () => {
  // Switching months quickly: August is slow, September is fast. August's
  // answer must not replace September's.
  const answers = { august: deferred(), september: deferred() };

  const load = (month) => {
    return answers[month].promise;
  };

  const { result, rerender } = renderHook((props) => useAsyncData(load, props.month), {
    initialProps: { month: 'august' },
  });

  rerender({ month: 'september' });

  await act(async () => {
    answers.september.resolve({ ok: true, data: 'september data' });
  });

  await act(async () => {
    answers.august.resolve({ ok: true, data: 'august data' });
  });

  expect(result.current.data).toBe('september data');
});


test('useAsyncData loads again when reload is called', async () => {
  let calls = 0;

  const load = async () => {
    calls = calls + 1;
    return { ok: true, data: calls };
  };

  const { result } = renderHook(() => useAsyncData(load));

  await waitFor(() => {
    expect(result.current.data).toBe(1);
  });

  act(() => {
    result.current.reload();
  });

  await waitFor(() => {
    expect(result.current.data).toBe(2);
  });
});


// ---------------------------------------------------------------
// useRecordEditor
// ---------------------------------------------------------------

function editorOptions(overrides) {
  return {
    add: vi.fn(async () => {
      return { ok: true };
    }),
    update: vi.fn(async () => {
      return { ok: true };
    }),
    remove: vi.fn(async () => {
      return { ok: true };
    }),
    onChanged: vi.fn(),
    ...overrides,
  };
}


test('saving a new record adds it, closes the form and reloads', async () => {
  const options = editorOptions();
  const { result } = renderHook(() => useRecordEditor(options));

  act(() => {
    result.current.startAdding();
  });
  expect(result.current.isOpen).toBe(true);
  expect(result.current.record).toBe(null);

  await act(async () => {
    await result.current.save({ name: 'Car' });
  });

  expect(options.add).toHaveBeenCalledWith({ name: 'Car' });
  expect(options.update).not.toHaveBeenCalled();
  expect(options.onChanged).toHaveBeenCalled();
  expect(result.current.isOpen).toBe(false);
});


test('saving an edited record updates it by id', async () => {
  const options = editorOptions();
  const { result } = renderHook(() => useRecordEditor(options));

  act(() => {
    result.current.startEditing({ id: 7, name: 'Old' });
  });

  await act(async () => {
    await result.current.save({ name: 'New' });
  });

  expect(options.update).toHaveBeenCalledWith(7, { name: 'New' });
});


test('a refused save keeps the form open so its error can be shown', async () => {
  const options = editorOptions({
    add: vi.fn(async () => {
      return { ok: false, error: 'Give this debt a name.' };
    }),
  });

  const { result } = renderHook(() => useRecordEditor(options));

  act(() => {
    result.current.startAdding();
  });

  let saveResult;
  await act(async () => {
    saveResult = await result.current.save({});
  });

  expect(saveResult.error).toBe('Give this debt a name.');
  expect(result.current.isOpen).toBe(true);
  expect(options.onChanged).not.toHaveBeenCalled();
});


test('regression: each record gets its own form key', () => {
  // Without a changing key, editing a second record kept the first record's
  // values in the form while saving them against the second record's id.
  const { result } = renderHook(() => useRecordEditor(editorOptions()));

  act(() => {
    result.current.startEditing({ id: 1 });
  });
  const firstKey = result.current.formKey;

  act(() => {
    result.current.startEditing({ id: 2 });
  });

  expect(result.current.formKey).not.toBe(firstKey);
});


// ---------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------

test('RecordActions asks before deleting', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();

  render(<RecordActions onEdit={() => {}} onDelete={onDelete} />);

  await user.click(screen.getByRole('button', { name: 'Delete' }));
  expect(onDelete).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Really delete' }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});


test('RecordActions can be backed out of', async () => {
  const user = userEvent.setup();
  const onDelete = vi.fn();

  render(<RecordActions onEdit={() => {}} onDelete={onDelete} deleteLabel="Remove" />);

  await user.click(screen.getByRole('button', { name: 'Remove' }));
  await user.click(screen.getByRole('button', { name: 'Keep' }));

  expect(onDelete).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
});


test('PillGroup marks the selected option and reports a new choice', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();

  const options = [
    { key: 'a', label: 'August' },
    { key: 'b', label: 'September' },
  ];

  render(<PillGroup options={options} selectedKey="a" onSelect={onSelect} />);

  expect(screen.getByRole('button', { name: 'August' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'September' })).toHaveAttribute('aria-pressed', 'false');

  await user.click(screen.getByRole('button', { name: 'September' }));
  expect(onSelect).toHaveBeenCalledWith('b');
});


test('Notice draws nothing without a message, and announces errors', () => {
  const { container, rerender } = render(<Notice tone="error">{''}</Notice>);
  expect(container).toBeEmptyDOMElement();

  rerender(<Notice tone="error">That EMI does not look right.</Notice>);
  expect(screen.getByRole('alert')).toHaveTextContent('That EMI does not look right.');
});
