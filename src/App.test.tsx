import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

const notesIn = (listName: string) =>
  within(screen.getByRole('list', { name: listName }))
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.tone__note')?.textContent);

const chordNotes = () => notesIn('Notes in the chord');
const scaleNotes = () => notesIn('Notes in the scale');

/** Highlighted piano keys as "midi:role", sorted. */
const highlightedKeys = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-highlighted="true"]')]
    .map((key) => `${key.getAttribute('data-midi')}:${key.getAttribute('data-role')}`)
    .sort();

/** Highlighted guitar positions as "string/fret:role", sorted. */
const highlightedFrets = (container: HTMLElement) =>
  [...container.querySelectorAll('[data-highlighted="true"]')]
    .map((dot) => `${dot.getAttribute('data-string')}/${dot.getAttribute('data-fret')}:${dot.getAttribute('data-role')}`)
    .sort();

describe('App', () => {
  it('starts on C major', () => {
    const { container } = render(<App />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('C major');
    expect(chordNotes()).toEqual(['C', 'E', 'G']);
    expect(screen.getByRole('img', { name: 'Piano keyboard showing C major: C, E, G' })).toBeInTheDocument();
    expect(highlightedKeys(container)).toEqual(['60:root', '64:third', '67:fifth']);
  });

  it('offers all 12 roots and every chord quality, grouped by family', () => {
    render(<App />);
    expect(within(screen.getByRole('group', { name: 'Root' })).getAllByRole('radio')).toHaveLength(12);
    expect(within(screen.getByRole('group', { name: 'Quality' })).getAllByRole('radio')).toHaveLength(36);
    expect(within(screen.getByRole('group', { name: 'Triads' })).getAllByRole('radio')).toHaveLength(6);
    expect(within(screen.getByRole('group', { name: 'Sevenths' })).getAllByRole('radio')).toHaveLength(10);
  });

  it('shows each quality as a chord symbol on the chosen root', async () => {
    const user = userEvent.setup();
    render(<App />);
    const symbolOf = (name: string) => screen.getByRole('radio', { name }).closest('label')?.textContent;
    expect(symbolOf('Major')).toBe('C');
    expect(symbolOf('Half-diminished seventh')).toBe('Cm7♭5');

    // Each chord gets its own root spelling: D♭ major but C♯ minor and C♯°.
    await user.click(screen.getByRole('radio', { name: 'C♯/D♭' }));
    expect(symbolOf('Major')).toBe('D♭');
    expect(symbolOf('Minor')).toBe('C♯m');
    expect(symbolOf('Diminished')).toBe('C♯°');
  });

  it('shows a seventh chord with four tones', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'A♯/B♭' }));
    await user.click(screen.getByRole('radio', { name: 'Dominant seventh' }));

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('B♭ dominant seventh');
    expect(chordNotes()).toEqual(['B♭', 'D', 'F', 'A♭']);
    expect(highlightedKeys(container)).toEqual(['70:root', '74:third', '77:fifth', '80:seventh']);
    expect(screen.getByText('Often left out')).toBeInTheDocument();
  });

  it('widens the keyboard for chords that reach past B5', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(container.querySelectorAll('[data-midi]')).toHaveLength(24);

    await user.click(screen.getByRole('radio', { name: 'B' }));
    await user.click(screen.getByRole('radio', { name: 'Dominant thirteenth' }));
    expect(chordNotes()).toEqual(['B', 'D♯', 'F♯', 'A', 'C♯', 'G♯']);
    expect(container.querySelectorAll('[data-midi]')).toHaveLength(36);
    expect(highlightedKeys(container)).toEqual([
      '71:root',
      '75:third',
      '78:fifth',
      '81:seventh',
      '85:ninth',
      '92:thirteenth',
    ]);
  });

  it('switches between the piano and the guitar neck', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    expect(screen.getByRole('radio', { name: 'Piano' })).toBeChecked();

    await user.click(screen.getByRole('radio', { name: 'Guitar' }));
    expect(screen.queryByRole('img', { name: /^Piano keyboard/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Guitar neck showing C major, shape 1 of 6, open position: x 3 2 0 1 0' }),
    ).toBeInTheDocument();
    // Only the open C chord is marked, with the low E string muted.
    expect(highlightedFrets(container)).toEqual(['1/0:third', '2/1:root', '3/0:fifth', '4/2:third', '5/3:root']);
    expect(container.querySelector('[data-muted="6"]')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Piano' }));
    expect(screen.queryByRole('img', { name: /^Guitar neck/ })).not.toBeInTheDocument();
    expect(highlightedKeys(container)).toEqual(['60:root', '64:third', '67:fifth']);
  });

  it('steps through the chord shapes with the arrows', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Guitar' }));
    const previous = screen.getByRole('button', { name: 'Previous shape' });
    const next = screen.getByRole('button', { name: 'Next shape' });
    expect(previous).toBeDisabled();
    expect(screen.getByText('Shape 1 of 6')).toBeInTheDocument();
    expect(screen.getByText('Open position')).toBeInTheDocument();

    await user.click(next);
    expect(screen.getByText('Shape 2 of 6')).toBeInTheDocument();
    expect(screen.getByText('Frets 3–6')).toBeInTheDocument();
    expect(highlightedFrets(container)).toEqual(['1/3:fifth', '2/5:third', '3/5:root', '4/5:fifth', '5/3:root']);
    expect(previous).toBeEnabled();

    for (let i = 0; i < 4; i++) await user.click(next);
    expect(screen.getByText('Shape 6 of 6')).toBeInTheDocument();
    expect(next).toBeDisabled();

    await user.click(previous);
    expect(screen.getByText('Shape 5 of 6')).toBeInTheDocument();
  });

  it('stays in the same area of the neck when the chord changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Guitar' }));
    await user.click(screen.getByRole('button', { name: 'Next shape' }));
    expect(screen.getByText('Frets 3–6')).toBeInTheDocument();

    // D major has shapes at frets 1, 2, 5, 7, 10 and 12; fret 2 is closest to 3.
    await user.click(screen.getByRole('radio', { name: 'D' }));
    expect(
      screen.getByRole('img', { name: 'Guitar neck showing D major, shape 2 of 6, frets 2–5: x 5 4 2 3 2' }),
    ).toBeInTheDocument();
  });

  it('spells E♭ minor with flats on the guitar neck', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Guitar' }));
    await user.click(screen.getByRole('radio', { name: 'D♯/E♭' }));
    await user.click(screen.getByRole('radio', { name: 'Minor' }));

    expect(
      screen.getByRole('img', { name: 'Guitar neck showing E♭ minor, shape 1 of 3, frets 1–4: x x 1 3 4 2' }),
    ).toBeInTheDocument();
    const notes = [...container.querySelectorAll('[data-highlighted="true"]')].map((dot) => dot.textContent);
    expect(notes).toEqual(['G♭', 'E♭', 'B♭', 'E♭']);
  });

  it('spells E♭ minor with flats', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'D♯/E♭' }));
    await user.click(screen.getByRole('radio', { name: 'Minor' }));

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('E♭ minor');
    expect(chordNotes()).toEqual(['E♭', 'G♭', 'B♭']);
    expect(highlightedKeys(container)).toEqual(['63:root', '66:third', '70:fifth']);
  });

  it('spells the C♯/D♭ key as D♭ major but C♯ minor', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'C♯/D♭' }));
    expect(chordNotes()).toEqual(['D♭', 'F', 'A♭']);

    await user.click(screen.getByRole('radio', { name: 'Minor' }));
    expect(chordNotes()).toEqual(['C♯', 'E', 'G♯']);
  });

  it('switches between the chord and circle of fifths tabs', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('tab', { name: 'Chords & scales' })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: 'Circle of fifths' }));
    expect(screen.getByRole('tab', { name: 'Circle of fifths' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Circle of fifths');
    expect(screen.getByRole('radiogroup', { name: /Circle of fifths/ })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Root' })).not.toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Chords & scales' })).toHaveFocus();
    expect(screen.getByRole('group', { name: 'Root' })).toBeInTheDocument();
  });

  it('shows B major across the octave break', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'B' }));

    expect(chordNotes()).toEqual(['B', 'D♯', 'F♯']);
    expect(highlightedKeys(container)).toEqual(['71:root', '75:third', '78:fifth']);
  });

  describe('scales', () => {
    it('switches to the major scale on the same root', async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole('radio', { name: 'Scale' }));

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('C major scale');
      expect(scaleNotes()).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
      expect(screen.queryByRole('group', { name: 'Quality' })).not.toBeInTheDocument();
      expect(within(screen.getByRole('group', { name: 'Scale' })).getAllByRole('radio')).toHaveLength(2);
      expect(within(screen.getByRole('group', { name: 'Tonic' })).getAllByRole('radio')).toHaveLength(12);
      expect(
        screen.getByRole('img', { name: 'Piano keyboard showing C major scale: C, D, E, F, G, A, B, C' }),
      ).toBeInTheDocument();
      expect(highlightedKeys(container)).toEqual([
        '60:degree-1',
        '62:degree-2',
        '64:degree-3',
        '65:degree-4',
        '67:degree-5',
        '69:degree-6',
        '71:degree-7',
        '72:degree-8',
      ]);
    });

    it('shows E♭ natural minor with flats', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('radio', { name: 'Scale' }));
      await user.click(screen.getByRole('radio', { name: 'D♯/E♭' }));
      await user.click(screen.getByRole('radio', { name: 'Natural minor' }));

      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('E♭ natural minor scale');
      expect(scaleNotes()).toEqual(['E♭', 'F', 'G♭', 'A♭', 'B♭', 'C♭', 'D♭']);
    });

    it('comes back to the same seventh chord after looking at its scale', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('radio', { name: 'Minor seventh' }));
      await user.click(screen.getByRole('radio', { name: 'Scale' }));
      expect(screen.getByRole('radio', { name: 'Natural minor' })).toBeChecked();

      await user.click(screen.getByRole('radio', { name: 'Chord' }));
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('C minor seventh');
    });

    it('keeps root and major/minor when switching between chord and scale', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByRole('radio', { name: 'A' }));
      await user.click(screen.getByRole('radio', { name: 'Minor' }));
      await user.click(screen.getByRole('radio', { name: 'Scale' }));

      expect(screen.getByRole('radio', { name: 'Natural minor' })).toBeChecked();
      expect(scaleNotes()).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

      await user.click(screen.getByRole('radio', { name: 'Major' }));
      await user.click(screen.getByRole('radio', { name: 'Chord' }));
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('A major');
      expect(chordNotes()).toEqual(['A', 'C♯', 'E']);
    });

    it('shows a scale on the guitar neck', async () => {
      const user = userEvent.setup();
      const { container } = render(<App />);
      await user.click(screen.getByRole('radio', { name: 'Scale' }));
      await user.click(screen.getByRole('radio', { name: 'Guitar' }));

      expect(
        screen.getByRole('img', {
          name: 'Guitar neck showing C major scale, position 1 of 7, open position: C, D, E, F, G, A, B',
        }),
      ).toBeInTheDocument();
      // The low E string in the open position: E F G, skipping F♯ and G♯ at frets 2 and 4.
      const lowE = () =>
        [...container.querySelectorAll('[data-string="6"]')].map(
          (dot) => `${dot.getAttribute('data-fret')}:${dot.textContent}`,
        );
      expect(lowE()).toEqual(['0:E', '1:F', '3:G']);
      expect(container.querySelector('[data-string="5"][data-fret="3"]')).toHaveAttribute('data-role', 'degree-1');

      await user.click(screen.getByRole('button', { name: 'Next position' }));
      expect(screen.getByText('Frets 3–6')).toBeInTheDocument();
      expect(lowE()).toEqual(['3:G', '5:A']);
    });
  });
});

